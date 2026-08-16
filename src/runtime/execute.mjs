import { verifyIR } from "../verifier/ir-verifier.mjs";
import { evaluate } from "./expressions.mjs";
import { isDeepStrictEqual } from "node:util";

export class RuntimeError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = "RuntimeError";
    this.code = code;
    this.details = details;
  }
}

export class OutcomeUnknownError extends RuntimeError {
  constructor(message = "Provider outcome is unknown.") {
    super("R_OUTCOME_UNKNOWN", message);
    this.name = "OutcomeUnknownError";
  }
}

export async function execute({
  ir,
  catalog,
  providers,
  input,
  executionId,
  runtimeGrants,
  journal,
}) {
  const verification = verifyIR(ir, catalog, {
    runtimeGrants,
    requireRuntimeGrants: true,
  });
  if (!verification.executable) {
    throw new RuntimeError(
      "R001_IR_REJECTED",
      "Runtime verification rejected the workflow IR.",
      verification.diagnostics,
    );
  }
  if (!executionId) {
    throw new RuntimeError("R002_EXECUTION_ID", "executionId is required.");
  }
  if (!journal) {
    throw new RuntimeError("R003_JOURNAL", "A durable journal is required.");
  }

  const environment = { input: structuredClone(input) };

  for (const step of ir.steps) {
    if (step.kind === "observe") {
      const structuralIdentity = `${executionId}/${step.structuralSite}`;
      const committed = journal.find("ObservationCommitted", structuralIdentity);
      if (committed) {
        environment[step.bind] = committed.output;
        continue;
      }
      const evaluatedInput = evaluate(step.input, environment);
      let planned = journal.find("ObservationPlanned", structuralIdentity);
      const isRecovery = Boolean(planned);
      const recovery = catalog.operations[step.operation].recovery.mode;
      if (!planned) {
        planned = journal.append({
          type: "ObservationPlanned",
          structuralIdentity,
          operation: step.operation,
          input: evaluatedInput,
          recovery,
        });
      } else if (
        planned.operation !== step.operation
        || planned.recovery !== recovery
        || !isDeepStrictEqual(planned.input, evaluatedInput)
      ) {
        throw new RuntimeError(
          "R202_OBSERVATION_PLAN_DRIFT",
          `Observation plan for '${step.label}' changed after planning.`,
        );
      }
      if (isRecovery && recovery !== "repeatable") {
        throw new RuntimeError(
          "R203_OBSERVATION_RECOVERY",
          `Observation '${step.label}' cannot repeat automatically.`,
          { recovery },
        );
      }
      const handler = providerHandler(providers, step.operation);
      const output = await handler(structuredClone(planned.input), {
        executionId,
        structuralIdentity,
      });
      journal.append({
        type: "ObservationCommitted",
        structuralIdentity,
        operation: step.operation,
        output,
      });
      environment[step.bind] = structuredClone(output);
      continue;
    }

    if (step.kind === "validate") {
      for (const [index, requirement] of step.requirements.entries()) {
        if (evaluate(requirement, environment) !== true) {
          throw new RuntimeError(
            "R100_VALIDATION_FAILED",
            `Validation '${step.bind}' failed requirement ${index + 1}.`,
          );
        }
      }
      environment[step.bind] = evaluate(step.value, environment);
      continue;
    }

    if (step.kind === "action") {
      await executeAction({
        step,
        catalog,
        providers,
        environment,
        executionId,
        journal,
      });
    }
  }

  return {
    status: "completed",
    executionId,
    values: structuredClone(environment),
    journal: journal.snapshot(),
  };
}

async function executeAction({
  step,
  catalog,
  providers,
  environment,
  executionId,
  journal,
}) {
  const structuralIdentity = `${executionId}/${step.structuralSite}`;
  const completed = journal.find("ActionCompleted", structuralIdentity);
  if (completed) return completed.output;

  const evaluatedIdentity = evaluate(step.providerIdentity, environment);
  const evaluatedInput = evaluate(step.input, environment);
  let planned = journal.find("ActionPlanned", structuralIdentity);
  const isRecovery = Boolean(planned);

  if (!planned) {
    planned = journal.append({
      type: "ActionPlanned",
      structuralIdentity,
      operation: step.operation,
      providerIdentity: evaluatedIdentity,
      input: evaluatedInput,
      recovery: step.recovery,
    });
  } else if (
    planned.operation !== step.operation
    || planned.recovery !== step.recovery
  ) {
    throw new RuntimeError(
      "R204_ACTION_PLAN_DRIFT",
      `Action plan for '${step.label}' changed after planning.`,
    );
  } else if (!isDeepStrictEqual(planned.providerIdentity, evaluatedIdentity)) {
    throw new RuntimeError(
      "R200_IDENTITY_DRIFT",
      `Provider identity for '${step.label}' changed after planning.`,
      {
        planned: planned.providerIdentity,
        evaluated: evaluatedIdentity,
      },
    );
  } else if (!isDeepStrictEqual(planned.input, evaluatedInput)) {
    throw new RuntimeError(
      "R205_ACTION_INPUT_DRIFT",
      `Action input for '${step.label}' changed after planning.`,
      {
        planned: planned.input,
        evaluated: evaluatedInput,
      },
    );
  }

  if (isRecovery) {
    if (step.recovery === "manual" || step.recovery === "unknown") {
      throw new RuntimeError(
        "R201_MANUAL_RECOVERY",
        `Action '${step.label}' requires manual recovery.`,
      );
    }
    if (step.recovery === "reconcile") {
      const recoveryOperation = catalog.operations[step.operation].recovery.operation;
      const reconcile = providerHandler(providers, recoveryOperation);
      const recovered = await reconcile({
        provider_identity: planned.providerIdentity,
        structural_identity: structuralIdentity,
        original_input: planned.input,
      }, {
        executionId,
        structuralIdentity: `${structuralIdentity}/reconcile`,
      });
      if (recovered?.found) {
        journal.append({
          type: "ActionCompleted",
          structuralIdentity,
          operation: step.operation,
          providerIdentity: planned.providerIdentity,
          recovered: true,
          output: recovered.result,
        });
        return recovered.result;
      }
    }
  }

  const handler = providerHandler(providers, step.operation);
  try {
    const output = await handler(structuredClone(planned.input), {
      executionId,
      structuralIdentity,
      providerIdentity: planned.providerIdentity,
    });
    journal.append({
      type: "ActionCompleted",
      structuralIdentity,
      operation: step.operation,
      providerIdentity: planned.providerIdentity,
      recovered: false,
      output,
    });
    return output;
  } catch (error) {
    if (error instanceof OutcomeUnknownError) throw error;
    journal.append({
      type: "ActionFailed",
      structuralIdentity,
      operation: step.operation,
      providerIdentity: planned.providerIdentity,
      error: error.message,
    });
    throw error;
  }
}

function providerHandler(providers, operation) {
  const handler = providers[operation];
  if (typeof handler !== "function") {
    throw new RuntimeError(
      "R300_PROVIDER_UNAVAILABLE",
      `No trusted host implementation exists for '${operation}'.`,
    );
  }
  return handler;
}

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
    super(
      "R_OUTCOME_UNKNOWN",
      typeof message === "string" && message.trim()
        ? message
        : "Provider outcome is unknown.",
    );
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
      const committed = await journal.find("ObservationCommitted", structuralIdentity);
      if (committed) {
        environment[step.bind] = committed.output;
        continue;
      }
      const evaluatedInput = evaluate(step.input, environment);
      let planned = await journal.find("ObservationPlanned", structuralIdentity);
      const isRecovery = Boolean(planned);
      const recovery = catalog.operations[step.operation].recovery.mode;
      if (!planned) {
        planned = await journal.append({
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
      await journal.append({
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
    journal: await journal.snapshot(),
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
  const completed = await journal.find("ActionCompleted", structuralIdentity);
  if (completed) return completed.output;

  const evaluatedIdentity = evaluate(step.providerIdentity, environment);
  const evaluatedInput = evaluate(step.input, environment);
  let planned = await journal.find("ActionPlanned", structuralIdentity);
  const isRecovery = Boolean(planned);

  if (!planned) {
    planned = await journal.append({
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
      const unknown = await recordUnknownOutcome(
        journal,
        planned,
        structuralIdentity,
      );
      throw new RuntimeError(
        "R201_MANUAL_RECOVERY",
        `Action '${step.label}' requires manual recovery.`,
        { reason: unknown.message },
      );
    }
    if (step.recovery === "reconcile") {
      const recoveryOperation = catalog.operations[step.operation].recovery.operation;
      const reconcile = providerHandler(providers, recoveryOperation);
      let recovered;
      try {
        recovered = await reconcile({
          provider_identity: planned.providerIdentity,
          structural_identity: structuralIdentity,
          original_input: planned.input,
        }, {
          executionId,
          structuralIdentity: `${structuralIdentity}/reconcile`,
        });
      } catch {
        throw await recordUnknownOutcome(
          journal,
          planned,
          structuralIdentity,
          `Reconciliation '${recoveryOperation}' did not establish the action's outcome.`,
        );
      }
      if (recovered?.found === true) {
        await journal.append({
          type: "ActionCompleted",
          structuralIdentity,
          operation: step.operation,
          providerIdentity: planned.providerIdentity,
          recovered: true,
          output: recovered.result,
        });
        return recovered.result;
      }
      if (recovered?.found !== false) {
        throw await recordUnknownOutcome(
          journal,
          planned,
          structuralIdentity,
          typeof recovered?.reason === "string" && recovered.reason.trim()
            ? recovered.reason
            : `Reconciliation '${recoveryOperation}' returned no authoritative outcome.`,
        );
      }
    }
  }

  const handler = providerHandler(providers, step.operation);
  await journal.append({
    type: "ActionDispatched",
    structuralIdentity,
    operation: step.operation,
    providerIdentity: planned.providerIdentity,
    recovery: planned.recovery,
  });
  let output;
  try {
    output = await handler(structuredClone(planned.input), {
      executionId,
      structuralIdentity,
      providerIdentity: planned.providerIdentity,
    });
  } catch (error) {
    if (error instanceof OutcomeUnknownError) {
      throw await recordUnknownOutcome(journal, planned, structuralIdentity, error.message);
    }
    await journal.append({
      type: "ActionFailed",
      structuralIdentity,
      operation: step.operation,
      providerIdentity: planned.providerIdentity,
      error: error.message,
    });
    throw error;
  }
  try {
    await journal.append({
      type: "ActionCompleted",
      structuralIdentity,
      operation: step.operation,
      providerIdentity: planned.providerIdentity,
      recovered: false,
      output,
    });
  } catch {
    throw await recordUnknownOutcome(
      journal,
      planned,
      structuralIdentity,
      `Action '${step.label}' returned, but its journal completion was not confirmed.`,
    );
  }
  return output;
}

async function recordUnknownOutcome(journal, planned, structuralIdentity, reason) {
  const previous = await journal.find("ActionOutcomeUnknown", structuralIdentity);
  const error = new OutcomeUnknownError(
    reason ?? previous?.reason
      ?? `Action '${planned.operation}' has an unconfirmed dispatch and requires manual recovery.`,
  );
  if (previous?.reason !== error.message) {
    await journal.append({
      type: "ActionOutcomeUnknown",
      structuralIdentity,
      operation: planned.operation,
      providerIdentity: planned.providerIdentity,
      recovery: planned.recovery,
      reason: error.message,
    });
  }
  return error;
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

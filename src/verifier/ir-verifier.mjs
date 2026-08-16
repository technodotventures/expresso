import {
  diagnostic,
  resultFromDiagnostics,
} from "../core/diagnostics.mjs";
import { verifyProgram } from "./source-verifier.mjs";

const STEP_KINDS = new Set(["observe", "validate", "action"]);

export function verifyIR(
  ir,
  catalog,
  { runtimeGrants, requireRuntimeGrants = false } = {},
) {
  const diagnostics = [];
  const add = (item) => diagnostics.push(diagnostic(item));

  if (!ir || typeof ir !== "object") {
    return resultFromDiagnostics([
      diagnostic({ code: "I001", message: "IR must be an object." }),
    ]);
  }
  if (ir.irVersion !== "1") {
    add({ code: "I002", message: "Unsupported or missing IR version." });
  }
  if (!ir.workflow || typeof ir.workflow.name !== "string") {
    add({ code: "I003", message: "IR must contain a named workflow." });
  }
  if (!Array.isArray(ir.workflow?.declaredGrants)) {
    add({ code: "I004", message: "IR workflow grants must be an array." });
  }
  if (!Array.isArray(ir.steps)) {
    add({ code: "I005", message: "IR steps must be an array." });
    return resultFromDiagnostics(diagnostics);
  }

  const labels = new Set();
  for (const [index, step] of ir.steps.entries()) {
    if (!step || typeof step !== "object" || !STEP_KINDS.has(step.kind)) {
      add({
        code: "I006",
        message: `IR step ${index} has an unsupported kind.`,
      });
      continue;
    }
    if (step.kind === "observe" || step.kind === "action") {
      if (typeof step.label !== "string" || step.label.length === 0) {
        add({
          code: "I007",
          message: `IR ${step.kind} step ${index} is missing a stable label.`,
        });
      } else if (labels.has(step.label)) {
        add({
          code: "I008",
          message: `IR operation label '${step.label}' is duplicated.`,
        });
      }
      labels.add(step.label);

      const expectedSite = `${ir.workflow?.name}/${step.kind}:${step.label}`;
      if (step.structuralSite !== expectedSite) {
        add({
          code: "I009",
          message: `IR structural site for '${step.label}' is invalid.`,
          repair: "Recompile the source; structural sites are compiler-assigned.",
        });
      }
      if (typeof step.operation !== "string") {
        add({
          code: "I010",
          message: `IR ${step.kind} '${step.label}' is missing an operation.`,
        });
      }
    }
    if (step.kind === "observe" && typeof step.bind !== "string") {
      add({ code: "I011", message: `IR observation ${index} is missing its binding.` });
    }
    if (step.kind === "validate") {
      if (typeof step.bind !== "string" || typeof step.source !== "string") {
        add({
          code: "I012",
          message: `IR validation ${index} is missing its source or binding.`,
        });
      }
      if (!Array.isArray(step.requirements)) {
        add({
          code: "I013",
          message: `IR validation ${index} must contain requirements.`,
        });
      }
    }
    if (step.kind === "action") {
      if (!step.providerIdentity) {
        add({
          code: "I014",
          message: `IR action '${step.label}' is missing provider identity.`,
        });
      }
      if (typeof step.recovery !== "string") {
        add({
          code: "I015",
          message: `IR action '${step.label}' is missing recovery semantics.`,
        });
      }
    }
  }

  if (diagnostics.some((item) => item.severity === "error")) {
    return resultFromDiagnostics(diagnostics);
  }

  const ast = irToAst(ir);
  const semantic = verifyProgram(ast, catalog);
  diagnostics.push(...semantic.diagnostics.map((item) => ({
    ...item,
    code: `IR_${item.code}`,
  })));

  if (requireRuntimeGrants && !Array.isArray(runtimeGrants)) {
    add({
      code: "I101",
      message: "Trusted host runtime grants must be supplied explicitly.",
      repair: "Pass an explicit runtimeGrants array; source declarations never confer authority.",
    });
  } else if (Array.isArray(runtimeGrants)) {
    const granted = new Set(runtimeGrants);
    for (const grant of semantic.analysis.requiredRuntimeGrants) {
      if (!granted.has(grant)) {
        add({
          code: "I100",
          message: `Host did not grant runtime authority for '${grant}'.`,
          repair: "Grant the operation in the trusted host; IR declarations never confer authority.",
        });
      }
    }
  }

  return resultFromDiagnostics(diagnostics, {
    analysis: semantic.analysis,
  });
}

function irToAst(ir) {
  return {
    type: "Workflow",
    name: ir.workflow.name,
    input: ir.workflow.input ?? { type: "Schema", fields: {} },
    grants: [...ir.workflow.declaredGrants],
    statements: ir.steps.map((step) => {
      if (step.kind === "observe") {
        return {
          type: "Observe",
          binding: step.bind,
          label: step.label,
          operation: step.operation,
          input: step.input,
        };
      }
      if (step.kind === "validate") {
        return {
          type: "Validate",
          binding: step.bind,
          source: step.source,
          requirements: step.requirements,
          value: step.value,
        };
      }
      return {
        type: "Action",
        label: step.label,
        operation: step.operation,
        identity: step.providerIdentity,
        recovery: step.recovery,
        input: step.input,
      };
    }),
  };
}

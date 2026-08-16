import { createHash } from "node:crypto";
import { resultFromDiagnostics } from "../core/diagnostics.mjs";
import { verifyProgram } from "../verifier/source-verifier.mjs";

export function compile(ast, catalog, { source = "" } = {}) {
  const verification = verifyProgram(ast, catalog);
  if (!verification.ok) {
    return resultFromDiagnostics(verification.diagnostics, {
      executable: false,
      ir: null,
      analysis: verification.analysis,
    });
  }

  const ir = {
    irVersion: "1",
    workflow: {
      name: ast.name,
      input: ast.input,
      declaredGrants: [...ast.grants],
    },
    sourceHash: createHash("sha256").update(source).digest("hex"),
    steps: ast.statements.map((statement) => lowerStatement(ast.name, statement)),
  };

  return {
    ...verification,
    ir,
  };
}

function lowerStatement(workflowName, statement) {
  if (statement.type === "Observe") {
    return {
      kind: "observe",
      bind: statement.binding,
      label: statement.label,
      structuralSite: `${workflowName}/observe:${statement.label}`,
      operation: statement.operation,
      input: statement.input,
    };
  }
  if (statement.type === "Validate") {
    return {
      kind: "validate",
      bind: statement.binding,
      source: statement.source,
      requirements: statement.requirements,
      value: statement.value,
    };
  }
  if (statement.type === "Action") {
    return {
      kind: "action",
      label: statement.label,
      structuralSite: `${workflowName}/action:${statement.label}`,
      operation: statement.operation,
      providerIdentity: statement.identity,
      recovery: statement.recovery,
      input: statement.input,
    };
  }
  throw new Error(`Cannot lower statement type '${statement.type}'.`);
}

export const PROVENANCE = Object.freeze({
  literal: "literal",
  input: "input",
  observed: "observed",
  validated: "validated",
  derived: "derived",
  unknown: "unknown",
});

export function baseBinding(kind) {
  switch (kind) {
    case PROVENANCE.literal:
      return { provenance: kind, tainted: false, stable: true };
    case PROVENANCE.input:
      return { provenance: kind, tainted: false, stable: true };
    case PROVENANCE.observed:
      return {
        provenance: kind,
        tainted: true,
        stable: true,
        stabilityReason: "committed-before-use",
      };
    case PROVENANCE.validated:
      return {
        provenance: kind,
        tainted: false,
        stable: true,
        evidence: "deterministic-validation",
      };
    default:
      return { provenance: PROVENANCE.unknown, tainted: true, stable: false };
  }
}

export function mergeBindings(bindings) {
  if (bindings.length === 0) return baseBinding(PROVENANCE.literal);
  return {
    provenance: PROVENANCE.derived,
    tainted: bindings.some((item) => item.tainted),
    stable: bindings.every((item) => item.stable),
    sources: [...new Set(bindings.flatMap((item) => (
      item.sources ?? [item.provenance]
    )))],
  };
}

export function expressionBinding(expression, environment, diagnostics, makeDiagnostic) {
  if (!expression) return baseBinding(PROVENANCE.unknown);
  switch (expression.type) {
    case "Literal":
      return baseBinding(PROVENANCE.literal);
    case "Reference": {
      const root = expression.path[0];
      const binding = environment.get(root);
      if (!binding) {
        diagnostics.push(makeDiagnostic({
          code: "E110",
          message: `Unknown value '${root}'.`,
          location: expression.location,
          repair: "Reference workflow input or a value bound by an earlier step.",
        }));
        return baseBinding(PROVENANCE.unknown);
      }
      return binding;
    }
    case "RecordExpression":
      return mergeBindings(
        Object.values(expression.fields).map((value) => (
          expressionBinding(value, environment, diagnostics, makeDiagnostic)
        )),
      );
    case "BinaryExpression":
      return mergeBindings([
        expressionBinding(expression.left, environment, diagnostics, makeDiagnostic),
        expressionBinding(expression.right, environment, diagnostics, makeDiagnostic),
      ]);
    default:
      diagnostics.push(makeDiagnostic({
        code: "E111",
        message: `Unsupported expression node '${expression.type}'.`,
        location: expression.location,
      }));
      return baseBinding(PROVENANCE.unknown);
  }
}

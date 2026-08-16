import {
  diagnostic,
  resultFromDiagnostics,
} from "../core/diagnostics.mjs";
import { operationFromCatalog } from "../providers/catalog.mjs";
import {
  PROVENANCE,
  baseBinding,
  expressionBinding,
} from "./provenance.mjs";

const RECOVERY_MODES = new Set([
  "idempotent_retry",
  "reconcile",
  "manual",
  "unknown",
]);

export function verifyProgram(ast, catalog) {
  const diagnostics = [];
  const environment = new Map([["input", baseBinding(PROVENANCE.input)]]);
  const labels = new Set();
  const declaredGrants = new Set(ast.grants);
  const requiredRuntimeGrants = new Set();

  const add = (item) => diagnostics.push(diagnostic(item));
  const analyze = (expression) => (
    expressionBinding(expression, environment, diagnostics, diagnostic)
  );

  for (const statement of ast.statements) {
    if (statement.label) {
      if (labels.has(statement.label)) {
        add({
          code: "E100",
          message: `Operation label '${statement.label}' is duplicated.`,
          location: statement.location,
          repair: "Give every observe and action site a unique stable label.",
        });
      }
      labels.add(statement.label);
    }

    if (statement.type === "Observe") {
      const operation = checkOperation({
        statement,
        expectedKind: "observation",
        catalog,
        declaredGrants,
        diagnostics,
      });
      analyze(statement.input);
      if (operation) requiredRuntimeGrants.add(statement.operation);
      environment.set(statement.binding, baseBinding(PROVENANCE.observed));
      continue;
    }

    if (statement.type === "Validate") {
      const source = environment.get(statement.source);
      if (!source) {
        add({
          code: "E110",
          message: `Validation references unknown value '${statement.source}'.`,
          location: statement.location,
        });
      } else if (!source.tainted) {
        add({
          code: "W200",
          severity: "warning",
          message: `Validation source '${statement.source}' is already untainted.`,
          location: statement.location,
        });
      }
      if (statement.requirements.length === 0) {
        add({
          code: "E200",
          message: "A validate block must contain at least one deterministic requirement.",
          location: statement.location,
          repair: "Add a business constraint, independent comparison, or approval boundary.",
        });
      }
      for (const requirement of statement.requirements) analyze(requirement);
      analyze(statement.value);
      environment.set(statement.binding, baseBinding(PROVENANCE.validated));
      continue;
    }

    if (statement.type === "Action") {
      const operation = checkOperation({
        statement,
        expectedKind: "action",
        catalog,
        declaredGrants,
        diagnostics,
      });
      if (operation) requiredRuntimeGrants.add(statement.operation);

      if (!statement.identity) {
        add({
          code: "E201",
          message: `Action '${statement.label}' is missing provider identity.`,
          location: statement.location,
          repair: "Add identity <expression over workflow input or validated data>.",
        });
      } else {
        const identity = analyze(statement.identity);
        if (identity.tainted || !identity.stable) {
          add({
            code: "E202",
            message: `Action '${statement.label}' derives identity from uncertain or unstable data.`,
            location: statement.identity.location,
            repair: "Derive identity from workflow input or a value discharged by validate.",
            details: {
              provenance: identity.provenance,
              tainted: identity.tainted,
              stable: identity.stable,
            },
          });
        }
      }

      if (!statement.input) {
        add({
          code: "E207",
          message: `Action '${statement.label}' is missing input.`,
          location: statement.location,
          repair: "Add input { ... } using untainted workflow values.",
        });
      }
      const input = analyze(statement.input);
      if (input.tainted) {
        add({
          code: "E203",
          message: `Observed data reaches action '${statement.label}' without validation.`,
          location: statement.input?.location ?? statement.location,
          repair: "Pass the observed value through validate before using it as action input.",
        });
      }

      if (!statement.recovery || !RECOVERY_MODES.has(statement.recovery)) {
        add({
          code: "E204",
          message: `Action '${statement.label}' must declare a recognized recovery mode.`,
          location: statement.location,
          repair: "Use the provider contract's mode, or recovery unknown when no verified source exists.",
        });
      } else if (operation && statement.recovery !== operation.recovery.mode) {
        add({
          code: "E205",
          message: `Action '${statement.label}' declares '${statement.recovery}' but provider contract requires '${operation.recovery.mode}'.`,
          location: statement.location,
          repair: operation.recovery.mode === "unknown"
            ? "Use recovery unknown; execution will remain blocked until provider semantics are established."
            : `Use recovery ${operation.recovery.mode}; do not infer a different provider guarantee.`,
          details: {
            contractEvidence: operation.recovery.evidence,
          },
        });
      }

      if (statement.recovery === "unknown" || operation?.recovery.mode === "unknown") {
        add({
          code: "B206",
          severity: "blocker",
          message: `Action '${statement.label}' has unknown recovery semantics and cannot execute.`,
          location: statement.location,
          repair: "Attach an authoritative or conformance-tested provider contract before execution.",
        });
      }

      const reconcileOperation = operation?.recovery.operation;
      if (reconcileOperation) {
        requiredRuntimeGrants.add(reconcileOperation);
        if (!declaredGrants.has(reconcileOperation)) {
          add({
            code: "E106",
            message: `Recovery for '${statement.label}' requires undeclared grant '${reconcileOperation}'.`,
            location: statement.location,
            repair: `Add ${reconcileOperation} to grants.`,
          });
        }
      }
    }
  }

  return resultFromDiagnostics(diagnostics, {
    analysis: {
      declaredGrants: [...declaredGrants],
      requiredRuntimeGrants: [...requiredRuntimeGrants],
      variables: Object.fromEntries(environment),
    },
  });
}

function checkOperation({
  statement,
  expectedKind,
  catalog,
  declaredGrants,
  diagnostics,
}) {
  const operation = operationFromCatalog(catalog, statement.operation);
  if (!operation) {
    diagnostics.push(diagnostic({
      code: "E101",
      message: `Unknown provider operation '${statement.operation}'.`,
      location: statement.location,
      repair: "Choose an operation from the verified provider catalog.",
    }));
    return null;
  }
  if (operation.kind !== expectedKind) {
    diagnostics.push(diagnostic({
      code: "E102",
      message: `'${statement.operation}' is ${operation.kind}, not ${expectedKind}.`,
      location: statement.location,
      repair: expectedKind === "action"
        ? "Call consequential operations only with action."
        : "Call externally determined reads only with observe.",
    }));
  }
  if (!declaredGrants.has(statement.operation)) {
    diagnostics.push(diagnostic({
      code: "E103",
      message: `Operation '${statement.operation}' is not declared in grants.`,
      location: statement.location,
      repair: `Add ${statement.operation} to the workflow grants block.`,
    }));
  }
  return operation;
}

import { readFile } from "node:fs/promises";
import { diagnostic, resultFromDiagnostics } from "../core/diagnostics.mjs";

const OPERATION_KINDS = new Set(["observation", "action"]);
const OBSERVATION_RECOVERY = new Set(["repeatable", "manual", "unknown"]);
const ACTION_RECOVERY = new Set([
  "idempotent_retry",
  "reconcile",
  "manual",
  "unknown",
]);
const EVIDENCE_LEVELS = new Set([
  "unknown",
  "inferred",
  "developer_asserted",
  "documentation_backed",
  "conformance_tested",
  "provider_verified",
]);

export async function loadCatalog(path) {
  const raw = JSON.parse(await readFile(path, "utf8"));
  const validation = validateCatalog(raw);
  if (!validation.ok) {
    const error = new Error(`Invalid provider catalog: ${path}`);
    error.diagnostics = validation.diagnostics;
    throw error;
  }
  return raw;
}

export function validateCatalog(catalog) {
  const diagnostics = [];
  if (!catalog || typeof catalog !== "object") {
    return resultFromDiagnostics([
      diagnostic({ code: "C001", message: "Provider catalog must be an object." }),
    ]);
  }
  if (catalog.catalogVersion !== "1") {
    diagnostics.push(diagnostic({
      code: "C002",
      message: "catalogVersion must be '1'.",
    }));
  }
  if (!catalog.operations || typeof catalog.operations !== "object") {
    diagnostics.push(diagnostic({
      code: "C003",
      message: "Provider catalog must define an operations object.",
    }));
    return resultFromDiagnostics(diagnostics);
  }

  for (const [name, operation] of Object.entries(catalog.operations)) {
    if (!OPERATION_KINDS.has(operation.kind)) {
      diagnostics.push(diagnostic({
        code: "C004",
        message: `Operation '${name}' has invalid kind '${operation.kind}'.`,
      }));
      continue;
    }

    const recovery = operation.recovery;
    if (!recovery || typeof recovery !== "object") {
      diagnostics.push(diagnostic({
        code: "C005",
        message: `Operation '${name}' must declare recovery metadata.`,
      }));
      continue;
    }
    const allowed = operation.kind === "action"
      ? ACTION_RECOVERY
      : OBSERVATION_RECOVERY;
    if (!allowed.has(recovery.mode)) {
      diagnostics.push(diagnostic({
        code: "C006",
        message: `Operation '${name}' has invalid ${operation.kind} recovery mode '${recovery.mode}'.`,
      }));
    }
    if (!EVIDENCE_LEVELS.has(recovery.evidence?.level)) {
      diagnostics.push(diagnostic({
        code: "C007",
        message: `Operation '${name}' must state a recognized recovery evidence level.`,
      }));
    }
    if (
      operation.kind === "action"
      && recovery.mode === "reconcile"
      && !recovery.operation
    ) {
      diagnostics.push(diagnostic({
        code: "C008",
        message: `Action '${name}' uses reconcile recovery but names no reconciliation operation.`,
      }));
    }
    if (operation.kind === "action" && !operation.capability) {
      diagnostics.push(diagnostic({
        code: "C009",
        message: `Action '${name}' must declare a capability.`,
      }));
    }
    if (operation.kind === "action" && !operation.providerIdentity) {
      diagnostics.push(diagnostic({
        code: "C010",
        message: `Action '${name}' must declare providerIdentity metadata.`,
      }));
    }
  }

  for (const [name, operation] of Object.entries(catalog.operations)) {
    const target = operation.recovery?.operation;
    if (target && !catalog.operations[target]) {
      diagnostics.push(diagnostic({
        code: "C011",
        message: `Operation '${name}' references unknown reconciliation operation '${target}'.`,
      }));
    } else if (target && catalog.operations[target].kind !== "observation") {
      diagnostics.push(diagnostic({
        code: "C012",
        message: `Reconciliation operation '${target}' must be an observation.`,
      }));
    }
  }

  return resultFromDiagnostics(diagnostics);
}

export function operationFromCatalog(catalog, name) {
  return catalog.operations?.[name] ?? null;
}

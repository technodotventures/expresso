import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parse } from "../language/parser.mjs";
import { loadCatalog } from "../providers/catalog.mjs";
import { verifyProgram } from "../verifier/source-verifier.mjs";

export async function loadTasks(path) {
  const tasks = JSON.parse(await readFile(path, "utf8"));
  if (!Array.isArray(tasks)) throw new Error("Experiment tasks must be an array.");
  return { tasks, tasksDirectory: dirname(resolve(path)) };
}

export async function runExperiment({
  tasks,
  tasksDirectory,
  adapter,
  maxRounds = 4,
}) {
  const results = [];
  for (const task of tasks) {
    if (task.surface !== "expresso") {
      results.push({
        taskId: task.id,
        surface: task.surface,
        status: "unsupported-surface",
        rounds: [],
      });
      continue;
    }

    const catalog = await loadCatalog(resolve(tasksDirectory, task.catalog));
    const rounds = [];
    let diagnostics = [];
    let status = "round-limit";

    for (let attempt = 1; attempt <= maxRounds; attempt += 1) {
      const generated = await adapter.generate({
        task: structuredClone(task),
        attempt,
        diagnostics,
        catalog: catalogForAuthoring(catalog),
      });
      const source = typeof generated === "string" ? generated : generated.source;
      const modelMetadata = typeof generated === "string"
        ? undefined
        : generated.metadata;
      const parsed = parse(source);
      const checked = parsed.ok
        ? verifyProgram(parsed.ast, catalog)
        : parsed;
      diagnostics = checked.diagnostics;
      rounds.push({
        attempt,
        ok: checked.ok,
        executable: checked.executable,
        diagnosticCodes: diagnostics.map((item) => item.code),
        diagnostics,
        ...(modelMetadata ? { modelMetadata } : {}),
      });
      if (checked.executable) {
        status = "verified";
        break;
      }
    }

    results.push({
      taskId: task.id,
      surface: task.surface,
      adapter: adapter.name,
      status,
      repairRounds: Math.max(0, rounds.length - 1),
      rounds,
    });
  }

  return {
    experimentVersion: "1",
    createdAt: new Date().toISOString(),
    totals: summarize(results),
    results,
  };
}

function catalogForAuthoring(catalog) {
  return {
    catalogVersion: catalog.catalogVersion,
    operations: Object.fromEntries(
      Object.entries(catalog.operations).map(([name, operation]) => [
        name,
        {
          kind: operation.kind,
          capability: operation.capability,
          providerIdentity: operation.providerIdentity,
          recovery: operation.recovery,
        },
      ]),
    ),
  };
}

function summarize(results) {
  const verified = results.filter((item) => item.status === "verified");
  const diagnosticFrequency = {};
  for (const result of results) {
    for (const round of result.rounds) {
      for (const code of round.diagnosticCodes) {
        diagnosticFrequency[code] = (diagnosticFrequency[code] ?? 0) + 1;
      }
    }
  }
  return {
    tasks: results.length,
    verified: verified.length,
    verificationRate: results.length === 0 ? 0 : verified.length / results.length,
    meanRepairRounds: verified.length === 0
      ? null
      : verified.reduce((sum, item) => sum + item.repairRounds, 0) / verified.length,
    diagnosticFrequency,
  };
}

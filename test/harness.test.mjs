import assert from "node:assert/strict";
import test from "node:test";
import { fixtureAdapter } from "../src/harness/adapters.mjs";
import { loadTasks, runExperiment } from "../src/harness/run.mjs";

test("captures diagnostics and repair rounds in the generate-check-repair loop", async () => {
  const loaded = await loadTasks("experiments/tasks.json");
  const result = await runExperiment({
    ...loaded,
    adapter: fixtureAdapter(loaded.tasksDirectory),
    maxRounds: 3,
  });
  assert.equal(result.totals.tasks, 1);
  assert.equal(result.totals.verified, 1);
  assert.equal(result.totals.meanRepairRounds, 1);
  assert.deepEqual(
    result.results[0].rounds[0].diagnosticCodes,
    ["E202", "E203", "E205", "E106"],
  );
});

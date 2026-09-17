import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const cli = resolve("src/cli.mjs");

test("reports the package version", async () => {
  const result = await execFileAsync(process.execPath, [cli, "--version"]);
  assert.equal(result.stdout.trim(), "0.3.3");
});

test("initializes and checks a workflow in a blank project", async (t) => {
  const project = await mkdtemp(resolve(tmpdir(), "expresso-cli-test-"));
  t.after(() => rm(project, { recursive: true, force: true }));

  const initialized = await execFileAsync(process.execPath, [cli, "init"], {
    cwd: project,
  });
  assert.match(initialized.stdout, /Initialized Expresso/);

  const workflow = await readFile(
    resolve(project, "expresso/refund.expresso"),
    "utf8",
  );
  assert.match(workflow, /workflow RefundCustomer/);

  const checked = await execFileAsync(
    process.execPath,
    [cli, "check", "expresso/refund.expresso"],
    { cwd: project },
  );
  assert.match(checked.stdout, /VERIFIED/);

  await assert.rejects(
    execFileAsync(process.execPath, [cli, "init"], { cwd: project }),
    (error) => (
      error.code === 1
      && /Refusing to overwrite existing Expresso files/.test(error.stderr)
    ),
  );
});

test("initializes a named project and resolves its adjacent catalog", async (t) => {
  const project = await mkdtemp(resolve(tmpdir(), "expresso-cli-target-"));
  t.after(() => rm(project, { recursive: true, force: true }));

  const initialized = await execFileAsync(
    process.execPath,
    [cli, "init", "sample"],
    { cwd: project },
  );
  assert.match(initialized.stdout, /sample.*expresso.*refund\.expresso/s);

  const checked = await execFileAsync(
    process.execPath,
    [cli, "check", "sample/expresso/refund.expresso"],
    { cwd: project },
  );
  assert.match(checked.stdout, /VERIFIED/);
});

test("rejects unknown and incomplete command options", async () => {
  await assert.rejects(
    execFileAsync(process.execPath, [cli, "init", "--force"]),
    (error) => error.code === 1 && /Unknown option '--force'/.test(error.stderr),
  );
  await assert.rejects(
    execFileAsync(
      process.execPath,
      [cli, "check", "examples/refund.expresso", "--catalog"],
    ),
    (error) => (
      error.code === 1
      && /Option '--catalog' requires a value/.test(error.stderr)
    ),
  );
});

test("emits a machine-readable customer-resolution recovery trace", async () => {
  const result = await execFileAsync(
    process.execPath,
    [cli, "demo", "customer-resolution", "--json"],
  );
  const trace = JSON.parse(result.stdout);

  assert.equal(trace.scenario, "customer-resolution");
  assert.deepEqual(trace.interruption.providerDispatches, {
    refunds: 1,
    confirmations: 0,
    tickets: 0,
  });
  assert.equal(trace.interruption.journalOutcome, "unresolved");
  assert.deepEqual(
    trace.recovery.actions.map((action) => ({
      operation: action.operation,
      recovered: action.recovered,
      dispatches: action.dispatches,
    })),
    [
      { operation: "payments.refund", recovered: true, dispatches: 1 },
      {
        operation: "messages.send_confirmation",
        recovered: false,
        dispatches: 1,
      },
      { operation: "support.close_ticket", recovered: false, dispatches: 1 },
    ],
  );
});

test("limits machine-readable demo output to customer-resolution", async () => {
  await assert.rejects(
    execFileAsync(process.execPath, [cli, "demo", "lost-response", "--json"]),
    (error) => (
      error.code === 1
      && /--json.*customer-resolution/.test(error.stderr)
    ),
  );
});

test("prints a human-readable customer-resolution demo by default", async () => {
  const result = await execFileAsync(
    process.execPath,
    [cli, "demo", "customer-resolution"],
  );

  assert.match(result.stdout, /Attempt 1: refund succeeded, response was lost\./);
  assert.match(result.stdout, /Attempt 2: refund reconciled/);
  assert.match(
    result.stdout,
    /Result: Refunded once\. Customer told\. Ticket closed\./,
  );
  assert.doesNotMatch(result.stdout, /\n\s*\{/);
});

test("documents JSON output only for the customer-resolution demo", async () => {
  const result = await execFileAsync(process.execPath, [cli, "--help"]);

  assert.match(result.stdout, /expresso demo lost-response/);
  assert.match(
    result.stdout,
    /expresso demo customer-resolution \[--json\]/,
  );
  assert.doesNotMatch(
    result.stdout,
    /demo <lost-response\|customer-resolution> \[--json\]/,
  );
});

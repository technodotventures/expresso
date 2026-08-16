import assert from "node:assert/strict";
import test from "node:test";
import {
  execute,
  OutcomeUnknownError,
  RuntimeError,
} from "../src/runtime/execute.mjs";
import { MemoryJournal } from "../src/runtime/journal.mjs";
import { createSyntheticProviders } from "../src/runtime/synthetic-providers.mjs";
import { foundation, input, runtimeGrants } from "./helpers.mjs";

test("reconciles a lost response without dispatching a duplicate action", async () => {
  const { catalog, compiled } = await foundation();
  const synthetic = createSyntheticProviders({ failAfterRefundOnce: true });
  const journal = new MemoryJournal();
  const request = {
    ir: compiled.ir,
    catalog,
    providers: synthetic.providers,
    input,
    executionId: "runtime-test-1",
    runtimeGrants,
    journal,
  };

  await assert.rejects(() => execute(request), OutcomeUnknownError);
  const result = await execute(request);

  assert.equal(result.status, "completed");
  assert.equal(synthetic.inspect().dispatches, 1);
  assert.equal(Object.keys(synthetic.inspect().refunds).length, 1);
  assert.deepEqual(
    journal.snapshot().map((entry) => entry.type),
    [
      "ObservationPlanned",
      "ObservationCommitted",
      "ActionPlanned",
      "ActionCompleted",
    ],
  );
});

test("requires explicit host grants before any provider dispatch", async () => {
  const { catalog, compiled } = await foundation();
  const synthetic = createSyntheticProviders();

  await assert.rejects(
    () => execute({
      ir: compiled.ir,
      catalog,
      providers: synthetic.providers,
      input,
      executionId: "runtime-test-no-grants",
      journal: new MemoryJournal(),
    }),
    (error) => (
      error instanceof RuntimeError
      && error.code === "R001_IR_REJECTED"
      && error.details.some((item) => item.code === "I101")
    ),
  );
  assert.equal(synthetic.inspect().dispatches, 0);
});

test("fails closed before repeating a non-repeatable observation", async () => {
  const { catalog, compiled } = await foundation();
  const manualCatalog = structuredClone(catalog);
  manualCatalog.operations["ai.propose_refund"].recovery = {
    mode: "manual",
    evidence: {
      level: "developer_asserted",
      source: "Runtime recovery regression fixture.",
    },
  };
  let observationCalls = 0;
  const synthetic = createSyntheticProviders();
  const providers = {
    ...synthetic.providers,
    "ai.propose_refund": async () => {
      observationCalls += 1;
      throw new Error("Observation response was not committed.");
    },
  };
  const request = {
    ir: compiled.ir,
    catalog: manualCatalog,
    providers,
    input,
    executionId: "runtime-test-observation-recovery",
    runtimeGrants,
    journal: new MemoryJournal(),
  };

  await assert.rejects(() => execute(request), /not committed/);
  await assert.rejects(
    () => execute(request),
    (error) => (
      error instanceof RuntimeError
      && error.code === "R203_OBSERVATION_RECOVERY"
    ),
  );
  assert.equal(observationCalls, 1);
});

test("rejects observation input drift before redispatch", async () => {
  const { catalog, compiled } = await foundation();
  const observeStep = compiled.ir.steps.find((step) => step.kind === "observe");
  const executionId = "runtime-test-observation-drift";
  let observationCalls = 0;
  const synthetic = createSyntheticProviders();
  const providers = {
    ...synthetic.providers,
    "ai.propose_refund": async () => {
      observationCalls += 1;
      return {};
    },
  };
  const journal = new MemoryJournal([
    {
      type: "ObservationPlanned",
      structuralIdentity: `${executionId}/${observeStep.structuralSite}`,
      operation: observeStep.operation,
      input: { case_id: "different-case", order_id: input.order_id },
      recovery: "repeatable",
    },
  ]);

  await assert.rejects(
    () => execute({
      ir: compiled.ir,
      catalog,
      providers,
      input,
      executionId,
      runtimeGrants,
      journal,
    }),
    (error) => (
      error instanceof RuntimeError
      && error.code === "R202_OBSERVATION_PLAN_DRIFT"
    ),
  );
  assert.equal(observationCalls, 0);
});

test("reconciles a structured provider identity by value", async () => {
  const { catalog, compiled } = await foundation();
  const ir = structuredClone(compiled.ir);
  const action = ir.steps.find((step) => step.kind === "action");
  action.providerIdentity = {
    type: "RecordExpression",
    fields: {
      refund_id: action.providerIdentity,
    },
  };
  const synthetic = createSyntheticProviders();
  const refunds = new Map();
  let dispatches = 0;
  const providers = {
    ...synthetic.providers,
    "payments.refund": async (actionInput, context) => {
      dispatches += 1;
      const key = JSON.stringify(context.providerIdentity);
      const receipt = {
        refund_id: structuredClone(context.providerIdentity),
        status: "succeeded",
        amount: actionInput.amount,
      };
      refunds.set(key, receipt);
      throw new OutcomeUnknownError();
    },
    "payments.lookup_refund": async (reconcileInput) => {
      const result = refunds.get(JSON.stringify(reconcileInput.provider_identity));
      return result
        ? { found: true, result: structuredClone(result) }
        : { found: false };
    },
  };
  const request = {
    ir,
    catalog,
    providers,
    input,
    executionId: "runtime-test-structured-identity",
    runtimeGrants,
    journal: new MemoryJournal(),
  };

  await assert.rejects(() => execute(request), OutcomeUnknownError);
  const result = await execute(request);

  assert.equal(result.status, "completed");
  assert.equal(dispatches, 1);
});

test("freezes provider identity at Planned and rejects drift", async () => {
  const { catalog, compiled } = await foundation();
  const synthetic = createSyntheticProviders();
  const observeStep = compiled.ir.steps.find((step) => step.kind === "observe");
  const actionStep = compiled.ir.steps.find((step) => step.kind === "action");
  const executionId = "runtime-test-drift";
  const journal = new MemoryJournal([
    {
      type: "ObservationCommitted",
      structuralIdentity: `${executionId}/${observeStep.structuralSite}`,
      output: {
        amount: 250,
        customer_id: "customer-1",
        reason: "duplicate charge",
      },
    },
    {
      type: "ActionPlanned",
      structuralIdentity: `${executionId}/${actionStep.structuralSite}`,
      operation: actionStep.operation,
      providerIdentity: "different-case",
      input: { amount: 250 },
      recovery: "reconcile",
    },
  ]);

  await assert.rejects(
    () => execute({
      ir: compiled.ir,
      catalog,
      providers: synthetic.providers,
      input,
      executionId,
      runtimeGrants,
      journal,
    }),
    (error) => error instanceof RuntimeError && error.code === "R200_IDENTITY_DRIFT",
  );
});

test("rejects action recovery and input drift before provider recovery", async () => {
  const { catalog, compiled } = await foundation();
  const synthetic = createSyntheticProviders();
  const observeStep = compiled.ir.steps.find((step) => step.kind === "observe");
  const actionStep = compiled.ir.steps.find((step) => step.kind === "action");
  const observation = {
    type: "ObservationCommitted",
    structuralIdentity: `placeholder/${observeStep.structuralSite}`,
    output: {
      amount: 250,
      customer_id: input.customer_id,
      reason: "duplicate charge",
    },
  };

  for (const [executionId, planned, expectedCode] of [
    [
      "runtime-test-action-recovery-drift",
      {
        operation: actionStep.operation,
        providerIdentity: input.case_id,
        input: {},
        recovery: "manual",
      },
      "R204_ACTION_PLAN_DRIFT",
    ],
    [
      "runtime-test-action-input-drift",
      {
        operation: actionStep.operation,
        providerIdentity: input.case_id,
        input: { amount: 1 },
        recovery: actionStep.recovery,
      },
      "R205_ACTION_INPUT_DRIFT",
    ],
  ]) {
    const journal = new MemoryJournal([
      {
        ...observation,
        structuralIdentity: `${executionId}/${observeStep.structuralSite}`,
      },
      {
        type: "ActionPlanned",
        structuralIdentity: `${executionId}/${actionStep.structuralSite}`,
        ...planned,
      },
    ]);

    await assert.rejects(
      () => execute({
        ir: compiled.ir,
        catalog,
        providers: synthetic.providers,
        input,
        executionId,
        runtimeGrants,
        journal,
      }),
      (error) => error instanceof RuntimeError && error.code === expectedCode,
    );
  }
  assert.equal(synthetic.inspect().dispatches, 0);
});

test("fails closed when deterministic validation rejects a proposal", async () => {
  const { catalog, compiled } = await foundation();
  const synthetic = createSyntheticProviders({
    proposal: {
      amount: 750,
      customer_id: "customer-1",
      reason: "too large",
    },
  });
  await assert.rejects(
    () => execute({
      ir: compiled.ir,
      catalog,
      providers: synthetic.providers,
      input,
      executionId: "runtime-test-validation",
      runtimeGrants,
      journal: new MemoryJournal(),
    }),
    (error) => error instanceof RuntimeError
      && error.code === "R100_VALIDATION_FAILED",
  );
  assert.equal(synthetic.inspect().dispatches, 0);
});

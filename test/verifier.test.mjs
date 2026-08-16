import assert from "node:assert/strict";
import test from "node:test";
import { parse } from "../src/language/parser.mjs";
import { verifyProgram } from "../src/verifier/source-verifier.mjs";
import { verifyIR } from "../src/verifier/ir-verifier.mjs";
import { fixture, foundation } from "./helpers.mjs";

test("accepts a validated, identity-stable action", async () => {
  const { parsed, catalog } = await foundation();
  const result = verifyProgram(parsed.ast, catalog);
  assert.equal(result.executable, true);
  assert.deepEqual(result.diagnostics, []);
});

test("rejects observed action input, observed identity, wrong recovery, and missing reconciliation grant", async () => {
  const source = await fixture("experiments/fixtures/refund.invalid.expresso");
  const { catalog } = await foundation();
  const parsed = parse(source);
  const result = verifyProgram(parsed.ast, catalog);
  assert.equal(result.ok, false);
  assert.deepEqual(
    new Set(result.diagnostics.map((item) => item.code)),
    new Set(["E202", "E203", "E205", "E106"]),
  );
});

test("admits recovery unknown but blocks execution", async () => {
  const { source, catalog } = await foundation();
  const unknownSource = source.replace("recovery reconcile", "recovery unknown");
  const unknownCatalog = structuredClone(catalog);
  unknownCatalog.operations["payments.refund"].recovery = {
    mode: "unknown",
    evidence: { level: "unknown", source: "No provider evidence." },
  };
  const parsed = parse(unknownSource);
  const result = verifyProgram(parsed.ast, unknownCatalog);
  assert.equal(result.ok, true);
  assert.equal(result.executable, false);
  assert.equal(result.diagnostics[0].code, "B206");
});

test("runtime IR verifier rejects a removed provider identity", async () => {
  const { catalog, compiled } = await foundation();
  const ir = structuredClone(compiled.ir);
  ir.steps.find((step) => step.kind === "action").providerIdentity = null;
  const result = verifyIR(ir, catalog);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((item) => item.code === "I014"));
});

test("runtime IR verifier catches a tampered observe-to-action flow", async () => {
  const { catalog, compiled } = await foundation();
  const ir = structuredClone(compiled.ir);
  const action = ir.steps.find((step) => step.kind === "action");
  action.providerIdentity = {
    type: "Reference",
    path: ["proposal", "customer_id"],
  };
  action.input = {
    type: "RecordExpression",
    fields: {
      amount: {
        type: "Reference",
        path: ["proposal", "amount"],
      },
    },
  };
  const result = verifyIR(ir, catalog);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((item) => item.code === "IR_E202"));
  assert.ok(result.diagnostics.some((item) => item.code === "IR_E203"));
});

test("runtime IR verifier requires host grants independent of declarations", async () => {
  const { catalog, compiled } = await foundation();
  const result = verifyIR(compiled.ir, catalog, {
    runtimeGrants: ["ai.propose_refund"],
  });
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((item) => item.code === "I100"));
});

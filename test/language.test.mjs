import assert from "node:assert/strict";
import test from "node:test";
import { parse } from "../src/language/parser.mjs";
import { fixture } from "./helpers.mjs";

test("parses the minimal observe/validate/action program", async () => {
  const source = await fixture("examples/refund.expresso");
  const result = parse(source);
  assert.equal(result.ok, true);
  assert.equal(result.ast.name, "RefundCustomer");
  assert.deepEqual(
    result.ast.statements.map((statement) => statement.type),
    ["Observe", "Validate", "Action"],
  );
});

test("rejects arbitrary imports", () => {
  const result = parse('import Stripe from "stripe"\nworkflow Unsafe {}');
  assert.equal(result.ok, false);
  assert.equal(result.diagnostics[0].code, "P100");
});

test("rejects ambient APIs not present in the whitelist grammar", () => {
  const result = parse(`workflow Unsafe {
    input {}
    grants {}
    let now = Date.now()
  }`);
  assert.equal(result.ok, false);
  assert.match(result.diagnostics[0].message, /observation or validation/i);
});

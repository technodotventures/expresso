import { OutcomeUnknownError } from "./execute.mjs";

export function createSyntheticProviders({
  failAfterRefundOnce = false,
  proposal = {
    amount: 250,
    customer_id: "customer-1",
    reason: "duplicate charge",
  },
} = {}) {
  const refunds = new Map();
  let shouldLoseResponse = failAfterRefundOnce;
  let dispatches = 0;

  const providers = {
    "ai.propose_refund": async () => structuredClone(proposal),
    "payments.refund": async (input, context) => {
      dispatches += 1;
      const existing = refunds.get(context.providerIdentity);
      if (existing) return structuredClone(existing);
      const receipt = {
        refund_id: context.providerIdentity,
        status: "succeeded",
        amount: input.amount,
      };
      refunds.set(context.providerIdentity, receipt);
      if (shouldLoseResponse) {
        shouldLoseResponse = false;
        throw new OutcomeUnknownError(
          "Synthetic provider completed the refund, then lost the response.",
        );
      }
      return structuredClone(receipt);
    },
    "payments.lookup_refund": async (input) => {
      const result = refunds.get(input.provider_identity);
      return result
        ? { found: true, result: structuredClone(result) }
        : { found: false };
    },
  };

  return {
    providers,
    inspect() {
      return {
        dispatches,
        refunds: Object.fromEntries(refunds),
      };
    },
  };
}

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
  const confirmations = new Map();
  const tickets = new Map();
  let shouldLoseRefundResponse = failAfterRefundOnce;
  const providerDispatches = {
    refunds: 0,
    confirmations: 0,
    tickets: 0,
  };

  const lookup = (store) => async (input) => {
    const result = store.get(input.provider_identity);
    return result
      ? { found: true, result: structuredClone(result) }
      : { found: false };
  };

  const providers = {
    "ai.propose_refund": async () => structuredClone(proposal),
    "payments.refund": async (input, context) => {
      providerDispatches.refunds += 1;
      const existing = refunds.get(context.providerIdentity);
      if (existing) return structuredClone(existing);
      const receipt = {
        refund_id: context.providerIdentity,
        status: "succeeded",
        amount: input.amount,
      };
      refunds.set(context.providerIdentity, receipt);
      if (shouldLoseRefundResponse) {
        shouldLoseRefundResponse = false;
        throw new OutcomeUnknownError(
          "Synthetic provider completed the refund, then lost the response.",
        );
      }
      return structuredClone(receipt);
    },
    "payments.lookup_refund": lookup(refunds),
    "messages.send_confirmation": async (input, context) => {
      providerDispatches.confirmations += 1;
      const existing = confirmations.get(context.providerIdentity);
      if (existing) return structuredClone(existing);
      const receipt = {
        message_id: context.providerIdentity,
        status: "sent",
        customer_id: input.customer_id,
      };
      confirmations.set(context.providerIdentity, receipt);
      return structuredClone(receipt);
    },
    "messages.lookup_confirmation": lookup(confirmations),
    "support.close_ticket": async (input, context) => {
      providerDispatches.tickets += 1;
      const existing = tickets.get(context.providerIdentity);
      if (existing) return structuredClone(existing);
      const receipt = {
        ticket_id: context.providerIdentity,
        status: "closed",
        case_id: input.case_id,
      };
      tickets.set(context.providerIdentity, receipt);
      return structuredClone(receipt);
    },
    "support.lookup_ticket": lookup(tickets),
  };

  return {
    providers,
    inspect() {
      return {
        dispatches: providerDispatches.refunds,
        providerDispatches: structuredClone(providerDispatches),
        refunds: Object.fromEntries(refunds),
        confirmations: Object.fromEntries(confirmations),
        tickets: Object.fromEntries(tickets),
      };
    },
  };
}

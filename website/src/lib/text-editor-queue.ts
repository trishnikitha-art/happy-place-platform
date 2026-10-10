import { sameTextMutation, type TextMutation } from './text-contract';

export interface TextQueueReceipt {
  transactionId: string;
  state: string;
  mutation: TextMutation | null;
  commitSha?: string;
  stagingVerified?: boolean;
}

export function isTerminalTextReceipt(receipt: TextQueueReceipt): boolean {
  return receipt.state === 'consumed' || receipt.state === 'cancelled';
}

export function isEligibleTextReceipt(receipt: TextQueueReceipt): receipt is TextQueueReceipt & { mutation: TextMutation } {
  return !!receipt.mutation && receipt.stagingVerified === true && !receipt.commitSha &&
    (receipt.state === 'prepared' || receipt.state === 'failed');
}

/** Validate the entire reviewed set against fresh server receipts before approval. */
export function prepareTextBatch(reviewed: readonly TextQueueReceipt[], fresh: readonly TextQueueReceipt[]): {
  transactionIds: string[];
  textApprovals: { transactionId: string; mutation: TextMutation }[];
} {
  if (!reviewed.length || fresh.length !== reviewed.length) throw new Error('Reload every queued receipt before publishing.');
  const ids = new Set<string>();
  const fields = new Set<string>();
  const freshById = new Map(fresh.map(receipt => [receipt.transactionId, receipt]));
  if (freshById.size !== fresh.length) throw new Error('Duplicate receipt in the publication queue.');
  const textApprovals = reviewed.map(receipt => {
    const saved = freshById.get(receipt.transactionId);
    if (!isEligibleTextReceipt(receipt) || !saved || !isEligibleTextReceipt(saved)) {
      throw new Error('Every queued receipt must be staged and unresolved before publishing.');
    }
    if (ids.has(receipt.transactionId) || fields.has(receipt.mutation.key)) {
      throw new Error('Queue only one receipt for each text field.');
    }
    if (!sameTextMutation(receipt.mutation, saved.mutation)) throw new Error('Staged change differs from review. Reload before publishing.');
    ids.add(receipt.transactionId);
    fields.add(receipt.mutation.key);
    return { transactionId: receipt.transactionId, mutation: { ...receipt.mutation } };
  });
  return { transactionIds: textApprovals.map(approval => approval.transactionId), textApprovals };
}

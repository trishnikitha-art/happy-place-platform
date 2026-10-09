import { decodeTextMutation, sameTextMutation, type TextMutation } from './text-contract';
import { TextError } from './text-errors';

/** Approval is an exact copy of the immutable receipt, never just a transaction ID. */
export function approvedTextMutation(approvals: unknown, transactionId: string, saved: unknown): TextMutation {
  if (!Array.isArray(approvals)) throw new TextError(400, 'TEXT_APPROVAL_REQUIRED');
  const matches = approvals.filter(a => a && a.transactionId === transactionId);
  if (matches.length !== 1) throw new TextError(400, 'TEXT_APPROVAL_REQUIRED');
  let reviewed: TextMutation;
  let persisted: TextMutation;
  try {
    reviewed = decodeTextMutation(matches[0].mutation);
    persisted = decodeTextMutation(saved);
  } catch { throw new TextError(400, 'TEXT_APPROVAL_INVALID'); }
  if (!sameTextMutation(reviewed, persisted)) throw new TextError(409, 'TEXT_APPROVAL_MISMATCH');
  return reviewed;
}

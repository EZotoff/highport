import type { AIProvenance, SessionSettings } from './types';

export type GMApprovalMode = SessionSettings['gmApprovalMode'];

/**
 * Determine whether an AI draft's text should be visible to the current user.
 *
 * - lenient: drafts are auto-accepted and always visible
 * - moderate: drafts are visible, but marked with a pending-review badge
 * - strict: GMs see drafts; players see a placeholder until the GM approves
 */
export function shouldShowDraft(
  mode: GMApprovalMode,
  provenance: AIProvenance<unknown> | undefined,
  isGM: boolean,
): boolean {
  if (mode === 'lenient') return true;
  if (mode === 'moderate') return true;
  // strict
  if (isGM) return true;
  return provenance?.pendingReviewBy !== 'gm';
}

/**
 * Determine whether a draft counts as canonical (accepted as the authoritative version).
 *
 * - lenient: always canonical (auto-accepted)
 * - moderate/strict: canonical only once accepted AND no longer pending GM review
 */
export function isCanonical(provenance: AIProvenance<unknown>, mode: GMApprovalMode): boolean {
  if (mode === 'lenient') return true;
  return provenance.status === 'accepted' && provenance.pendingReviewBy !== 'gm';
}

/**
 * Determine whether GM review is still pending for this draft.
 *
 * - lenient: never pending (auto-accepted)
 * - moderate/strict: pending when explicitly stamped as awaiting GM review
 */
export function requiresReview(provenance: AIProvenance<unknown>, mode: GMApprovalMode): boolean {
  if (mode === 'lenient') return false;
  return provenance.pendingReviewBy === 'gm';
}

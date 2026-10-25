import type { CareerMishap } from '@highport/mgt2e';
import type { VerbosityLevel } from './narrative';
import type { CareerTermResult, SessionSettings } from './types';

export function applyForcedMusterOut(
  terms: CareerTermResult[],
  opts: {
    readonly mishap?: CareerMishap;
    readonly generatedMishapDesc?: string;
    readonly verbosity: VerbosityLevel;
    readonly gmApprovalMode: SessionSettings['gmApprovalMode'];
  },
): CareerTermResult[] {
  const updatedTerms = [...terms];
  const termUpdate: Partial<CareerTermResult> = {};
  if (opts.mishap) termUpdate.mishap = opts.mishap;
  const existingDescription = terms[terms.length - 1]?.mishapDescription;
  if (typeof existingDescription !== 'object' && opts.generatedMishapDesc !== undefined) {
    const isLenient = opts.gmApprovalMode === 'lenient';
    termUpdate.mishapDescription = {
      value: opts.generatedMishapDesc,
      source: 'ai',
      mode: opts.verbosity,
      status: isLenient ? 'accepted' : 'draft',
      derivedFrom: `mishap-${opts.mishap?.description?.slice(0, 30) ?? 'unknown'}`,
      generatedAt: Date.now(),
      pendingReviewBy: isLenient ? null : 'gm',
    };
  }
  updatedTerms[terms.length - 1] = { ...updatedTerms[terms.length - 1], ...termUpdate };
  return updatedTerms;
}

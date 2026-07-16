'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Shield,
  Lock,
  Unlock,
  Users,
  Download,
  Ban,
  Pencil,
} from 'lucide-react';
import { useGMControls, ALL_CAREERS } from '../../lib/chargen/useGMControls';
import { useAllCharacters } from '../../lib/chargen/hooks';
import { SciFiButton } from '@/components/ui/scifi';
import VerbositySelector from './VerbositySelector';
import SettingSelector from './SettingSelector';
import type { CrossCharacterLinkProposal, AIProvenance } from '../../lib/chargen/types';
import { useCrossCharacterLinks as useCrossCharacterLinkGenerator } from '../../lib/chargen/useNarrative';
import { useCrossCharacterLinks as useYjsCrossCharacterLinks } from '../../lib/chargen/hooks';
import {
  getCrossCharacterLinksMap,
  createCrossCharacterLinkEdge,
  resolveCrossCharacterLink,
  resolveAIDraft,
} from '../../lib/chargen/state';
import { getYDoc } from '../../lib/ydoc';
import { Loader2, RefreshCw } from 'lucide-react';
interface GMControlPanelProps {
  currentUserId: string;
}

interface PendingAIDraft {
  characterId: string;
  characterName: string;
  termNumber: number;
  fieldPath: 'eventDescription' | 'mishapDescription';
  fieldType: string;
  value: string;
}

const GM_APPROVAL_MODE_OPTIONS = [
  {
    value: 'moderate',
    label: 'Moderate',
    description:
      "AI drafts are visible to the player with a 'Pending GM Approval' badge until the GM reviews.",
  },
  {
    value: 'strict',
    label: 'Strict',
    description:
      "AI drafts are hidden from the player behind a 'Pending GM Review' placeholder until the GM approves.",
  },
  {
    value: 'lenient',
    label: 'Lenient',
    description:
      'AI drafts auto-accept immediately; the GM can retroactively reject from the GM panel.',
  },
] as const;

const CROSS_CHARACTER_LINK_MODE_OPTIONS = [
  {
    value: 'gm-mediated',
    label: 'GM-Mediated',
    description: "Cross-character link proposals go to the GM's batch review panel.",
  },
  {
    value: 'player-to-player',
    label: 'Player-to-Player',
    description:
      "Cross-character link proposals appear on both players' screens for mutual acceptance.",
  },
] as const;

export function GMControlPanel({ currentUserId }: GMControlPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingProposalId, setEditingProposalId] = useState<string | null>(null);
  const [editedDescription, setEditedDescription] = useState('');
  const { isGM, settings, pendingRequests, actions } = useGMControls(currentUserId);
  const allCharacters = useAllCharacters();
  const {
    isLoading: isLoadingProposals,
    error: errorProposals,
    refresh: refreshProposals,
  } = useCrossCharacterLinkGenerator();

  const yjsProposals = useYjsCrossCharacterLinks();

  const [editingDraftKey, setEditingDraftKey] = useState<string | null>(null);
  const [editedDraftText, setEditedDraftText] = useState('');

  const pendingAIDrafts = useMemo<PendingAIDraft[]>(() => {
    const drafts: PendingAIDraft[] = [];
    for (const char of allCharacters) {
      for (const term of char.terms) {
        for (const fieldPath of ['eventDescription', 'mishapDescription'] as const) {
          const field = term[fieldPath];
          if (typeof field === 'object' && field !== null && 'value' in field) {
            const prov = field as AIProvenance<string>;
            if (prov.pendingReviewBy === 'gm') {
              drafts.push({
                characterId: char.id,
                characterName: char.name || 'Unnamed',
                termNumber: term.termNumber,
                fieldPath,
                fieldType: fieldPath === 'eventDescription' ? 'Event' : 'Mishap',
                value: prov.value,
              });
            }
          }
        }
      }
    }
    return drafts;
  }, [allCharacters]);

  const showCrossCharacterProposals = settings?.crossCharacterLinkMode === 'gm-mediated';

  useEffect(() => {
    if (showCrossCharacterProposals && isOpen) {
      refreshProposals();
    }
  }, [showCrossCharacterProposals, isOpen, refreshProposals]);

  const pendingProposals = yjsProposals.filter((p) => p.status === 'pending');

  const handleAcceptProposal = (proposal: CrossCharacterLinkProposal) => {
    const doc = getYDoc();
    if (editingProposalId === proposal.id && editedDescription !== proposal.description) {
      const linkMap = getCrossCharacterLinksMap(doc).get(proposal.id);
      if (linkMap) {
        doc.transact(() => {
          linkMap.set('description', editedDescription);
        });
      }
    }
    resolveCrossCharacterLink(doc, proposal.id, true);
    createCrossCharacterLinkEdge(doc, proposal);
    setEditingProposalId(null);
    setEditedDescription('');
  };

  const handleEditProposal = (proposal: CrossCharacterLinkProposal) => {
    setEditingProposalId(proposal.id);
    setEditedDescription(proposal.description);
  };

  const handleRejectProposal = (proposal: CrossCharacterLinkProposal) => {
    const doc = getYDoc();
    resolveCrossCharacterLink(doc, proposal.id, false);
  };

  const getDraftKey = (draft: PendingAIDraft) =>
    `${draft.characterId}:${draft.termNumber}:${draft.fieldPath}`;

  const handleAcceptAIDraft = (draft: PendingAIDraft) => {
    const doc = getYDoc();
    const editedText = editingDraftKey === getDraftKey(draft) ? editedDraftText : undefined;
    resolveAIDraft(
      doc,
      draft.characterId,
      draft.termNumber,
      draft.fieldPath,
      editedText !== undefined ? 'edit' : 'accept',
      editedText,
    );
    setEditingDraftKey(null);
    setEditedDraftText('');
  };

  const handleRejectAIDraft = (draft: PendingAIDraft) => {
    const doc = getYDoc();
    resolveAIDraft(doc, draft.characterId, draft.termNumber, draft.fieldPath, 'reject');
    setEditingDraftKey(null);
    setEditedDraftText('');
  };

  const handleEditAIDraft = (draft: PendingAIDraft) => {
    setEditingDraftKey(getDraftKey(draft));
    setEditedDraftText(draft.value);
  };

  const handleCancelEditDraft = () => {
    setEditingDraftKey(null);
    setEditedDraftText('');
  };

  if (!isGM) return null;

  const getCharacterName = (charId: string) => {
    const char = allCharacters.find((c) => c.id === charId);
    return char?.name || 'Unknown Character';
  };

  if (!settings) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Collapse GM controls' : 'Expand GM controls'}
        className="flex items-center justify-between w-full px-4 py-3 min-h-[44px] bg-zinc-900 border-b border-zinc-800 hover:bg-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus-visible:ring-2"
      >
        <div className="flex items-center gap-2 text-white font-bold">
          <Shield className="w-4 h-4 text-blue-500" />
          <span>GM CONTROLS</span>
          {pendingRequests.length > 0 && (
            <span className="px-1.5 py-0.5 text-xs font-bold bg-blue-600 text-white rounded-full">
              {pendingRequests.length}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-label" />
        ) : (
          <ChevronRight className="w-4 h-4 text-label" />
        )}
      </button>

      {isOpen && (
        <div className="overflow-y-auto p-4 space-y-6 custom-scrollbar">
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-subtle uppercase tracking-wider">
              Session Settings
            </h3>

            <div className="space-y-2">
              <label
                htmlFor="gm-lock-session"
                className="flex items-center justify-between text-sm text-label cursor-pointer hover:brightness-125"
              >
                <div className="flex items-center gap-2">
                  {settings.isLocked ? (
                    <Lock className="w-3.5 h-3.5" />
                  ) : (
                    <Unlock className="w-3.5 h-3.5" />
                  )}
                  <span>Lock Session</span>
                </div>
                <input
                  id="gm-lock-session"
                  type="checkbox"
                  checked={settings.isLocked}
                  onChange={(e) => actions.updateSettings({ isLocked: e.target.checked })}
                  className="rounded border-zinc-700 bg-zinc-800 text-blue-600 focus:ring-blue-500"
                />
              </label>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2 text-sm text-label">
                <span>AI Verbosity</span>
              </div>
              <VerbositySelector
                value={settings.aiVerbosity}
                onChange={(v) => actions.updateSettings({ aiVerbosity: v })}
              />
            </div>
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2 text-sm text-label">
                <span>GM Approval Mode</span>
              </div>
              <SettingSelector
                value={settings.gmApprovalMode}
                options={GM_APPROVAL_MODE_OPTIONS}
                onChange={(v) => actions.updateSettings({ gmApprovalMode: v })}
                label="GM Approval Mode"
              />
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2 text-sm text-label">
                <span>Cross-Character Links</span>
              </div>
              <SettingSelector
                value={settings.crossCharacterLinkMode}
                options={CROSS_CHARACTER_LINK_MODE_OPTIONS}
                onChange={(v) => actions.updateSettings({ crossCharacterLinkMode: v })}
                label="Cross-Character Links"
              />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-subtle uppercase tracking-wider">
              Allowed Careers
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {ALL_CAREERS.map((career) => {
                const isAllowed =
                  settings.allowedCareers.length === 0 ||
                  settings.allowedCareers.includes(career.id);
                return (
                  <label
                    key={career.id}
                    className={`
                      flex items-center gap-2 px-2 py-1.5 rounded text-xs border cursor-pointer transition-colors
                      ${
                        isAllowed
                          ? 'bg-zinc-800 border-zinc-700 text-default hover:bg-zinc-700'
                          : 'bg-zinc-900/50 border-zinc-800 text-subtle hover:bg-zinc-900'
                      }
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={isAllowed}
                      onChange={() => actions.toggleCareer(career.id)}
                      className="hidden"
                    />
                    <div
                      className={`w-3 h-3 rounded-sm border flex items-center justify-center ${isAllowed ? 'bg-blue-600 border-blue-600' : 'border-zinc-700'}`}
                    >
                      {isAllowed && <Check className="w-2.5 h-2.5 text-heading" />}
                    </div>
                    {career.name}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-subtle uppercase tracking-wider">
                Pending Approvals
              </h3>
              {pendingRequests.length > 0 && (
                <span className="text-xs text-subtle">{pendingRequests.length} waiting</span>
              )}
            </div>

            {pendingRequests.length === 0 ? (
              <div className="text-xs text-subtle italic text-center py-4 border border-zinc-900 rounded bg-zinc-900/20">
                No pending requests
              </div>
            ) : (
              <div className="space-y-2">
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-2 bg-zinc-900 rounded border border-zinc-800 text-sm"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-default">
                        {getCharacterName(req.requesterCharId)}
                      </span>
                      <span className="text-xs text-subtle">
                        {new Date(req.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="text-subtle text-xs mb-3">
                      wants to connect to{' '}
                      <span className="text-label">{req.entity?.name || 'Unknown Entity'}</span> as{' '}
                      <span className="text-blue-400">{req.relationship}</span>
                    </div>
                    {req.note && (
                      <div className="text-subtle text-xs italic mb-3 pl-2 border-l-2 border-zinc-800">
                        "{req.note}"
                      </div>
                    )}
                    <div className="flex gap-2">
                      <SciFiButton
                        theme="emerald"
                        scifiVariant="secondary"
                        size="sm"
                        onClick={() => actions.approveRequest(req.id)}
                        className="flex-1"
                      >
                        <Check className="w-3 h-3" /> Approve
                      </SciFiButton>
                      <SciFiButton
                        scifiVariant="destructive"
                        size="sm"
                        onClick={() => actions.rejectRequest(req.id)}
                        className="flex-1"
                      >
                        <X className="w-3 h-3" /> Reject
                      </SciFiButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {showCrossCharacterProposals && (
            <div className="space-y-3 pt-4 border-t border-zinc-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-subtle uppercase tracking-wider">
                  Cross-Character Proposals
                </h3>
                <div className="flex items-center gap-2">
                  <SciFiButton
                    theme="slate"
                    scifiVariant="ghost"
                    size="sm"
                    onClick={refreshProposals}
                    disabled={isLoadingProposals}
                    className="h-7 px-2"
                  >
                    {isLoadingProposals ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                  </SciFiButton>
                  {pendingProposals.length > 0 && (
                    <span className="text-xs text-subtle">{pendingProposals.length} waiting</span>
                  )}
                </div>
              </div>

              {errorProposals && (
                <div className="text-xs text-red-400 bg-red-950/20 border border-red-900/50 rounded p-2">
                  {errorProposals}
                </div>
              )}

              {isLoadingProposals && pendingProposals.length === 0 && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                </div>
              )}

              {!isLoadingProposals && pendingProposals.length === 0 ? (
                <div className="text-xs text-subtle italic text-center py-4 border border-zinc-900 rounded bg-zinc-900/20">
                  No pending proposals
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingProposals.map((proposal) => (
                    <div
                      key={proposal.id}
                      className="p-2 bg-zinc-900 rounded border border-zinc-800 text-sm"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-default">
                          {getCharacterName(proposal.sourceCharId)} ↔{' '}
                          {getCharacterName(proposal.targetCharId)}
                        </span>
                      </div>
                      <div className="text-subtle text-xs mb-1">
                        Proposed Relationship:{' '}
                        <span className="text-blue-400 font-medium">{proposal.relationship}</span>
                      </div>
                      {editingProposalId === proposal.id ? (
                        <input
                          aria-label="Relationship description"
                          value={editedDescription}
                          onChange={(event) => setEditedDescription(event.target.value)}
                          className="w-full min-h-[44px] mb-3 rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-default focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        />
                      ) : proposal.description ? (
                        <div className="text-subtle text-xs italic mb-3 pl-2 border-l-2 border-zinc-800">
                          "{proposal.description}"
                        </div>
                      ) : null}
                      <div className="flex gap-2">
                        <SciFiButton
                          theme="slate"
                          scifiVariant="ghost"
                          size="sm"
                          onClick={() => handleEditProposal(proposal)}
                          className="flex-1"
                        >
                          <Pencil className="w-3 h-3" /> Edit
                        </SciFiButton>
                        <SciFiButton
                          theme="emerald"
                          scifiVariant="secondary"
                          size="sm"
                          onClick={() => handleAcceptProposal(proposal)}
                          className="flex-1"
                        >
                          <Check className="w-3 h-3" /> Accept
                        </SciFiButton>
                        <SciFiButton
                          scifiVariant="destructive"
                          size="sm"
                          onClick={() => handleRejectProposal(proposal)}
                          className="flex-1"
                        >
                          <X className="w-3 h-3" /> Reject
                        </SciFiButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-subtle uppercase tracking-wider">
                Pending AI Review
              </h3>
              {pendingAIDrafts.length > 0 && (
                <span className="text-xs text-subtle">{pendingAIDrafts.length} waiting</span>
              )}
            </div>

            {pendingAIDrafts.length === 0 ? (
              <div className="text-xs text-subtle italic text-center py-4 border border-zinc-900 rounded bg-zinc-900/20">
                No AI drafts pending review
              </div>
            ) : (
              <div className="space-y-2">
                {pendingAIDrafts.map((draft) => {
                  const draftKey = getDraftKey(draft);
                  const isEditing = editingDraftKey === draftKey;
                  return (
                    <div
                      key={draftKey}
                      className="p-2 bg-zinc-900 rounded border border-zinc-800 text-sm"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-default">{draft.characterName}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-950/50 text-cyan-400 border border-cyan-900/50">
                          {draft.fieldType}
                        </span>
                      </div>
                      <div className="text-xs text-subtle mb-1">Term {draft.termNumber}</div>
                      {isEditing ? (
                        <textarea
                          aria-label="Edit AI draft text"
                          value={editedDraftText}
                          onChange={(event) => setEditedDraftText(event.target.value)}
                          rows={3}
                          className="w-full min-h-[44px] mb-3 rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-default focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        />
                      ) : (
                        <div className="text-subtle text-xs italic mb-3 pl-2 border-l-2 border-zinc-800">
                          "{draft.value}"
                        </div>
                      )}
                      <div className="flex gap-2">
                        {isEditing ? (
                          <>
                            <SciFiButton
                              theme="emerald"
                              scifiVariant="secondary"
                              size="sm"
                              onClick={() => handleAcceptAIDraft(draft)}
                              className="flex-1"
                            >
                              <Check className="w-3 h-3" /> Save Edit
                            </SciFiButton>
                            <SciFiButton
                              theme="slate"
                              scifiVariant="ghost"
                              size="sm"
                              onClick={handleCancelEditDraft}
                              className="flex-1"
                            >
                              <X className="w-3 h-3" /> Cancel
                            </SciFiButton>
                          </>
                        ) : (
                          <>
                            <SciFiButton
                              theme="slate"
                              scifiVariant="ghost"
                              size="sm"
                              onClick={() => handleEditAIDraft(draft)}
                              className="flex-1"
                            >
                              <Pencil className="w-3 h-3" /> Edit
                            </SciFiButton>
                            <SciFiButton
                              theme="emerald"
                              scifiVariant="secondary"
                              size="sm"
                              onClick={() => handleAcceptAIDraft(draft)}
                              className="flex-1"
                            >
                              <Check className="w-3 h-3" /> Accept
                            </SciFiButton>
                            <SciFiButton
                              scifiVariant="destructive"
                              size="sm"
                              onClick={() => handleRejectAIDraft(draft)}
                              className="flex-1"
                            >
                              <X className="w-3 h-3" /> Reject
                            </SciFiButton>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-zinc-800 space-y-2">
            <SciFiButton
              theme="slate"
              scifiVariant="secondary"
              onClick={actions.exportAllCharacters}
              className="w-full"
            >
              <Download className="w-4 h-4" /> Export All Characters
            </SciFiButton>
            <SciFiButton
              scifiVariant="destructive"
              onClick={() => {
                if (confirm('Are you sure you want to end the session? This cannot be undone.')) {
                  actions.endSession();
                }
              }}
              className="w-full"
            >
              <Ban className="w-4 h-4" /> End Session
            </SciFiButton>
          </div>
        </div>
      )}
    </div>
  );
}

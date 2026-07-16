import { useCrossCharacterLinks, useAllCharacters } from '../../lib/chargen/hooks';
import { getYDoc } from '../../lib/ydoc';
import { acceptCrossCharacterLink, removeCrossCharacterLink } from '../../lib/chargen/state';

interface CrossCharacterProposalListProps {
  currentCharId: string;
}

export default function CrossCharacterProposalList({
  currentCharId,
}: CrossCharacterProposalListProps) {
  const allLinks = useCrossCharacterLinks();
  const characters = useAllCharacters();

  const myProposals = allLinks.filter(
    (link) =>
      (link.sourceCharId === currentCharId || link.targetCharId === currentCharId) &&
      link.status === 'pending' &&
      !(link.acceptedBy ?? []).includes(currentCharId),
  );

  if (myProposals.length === 0) {
    return (
      <div className="text-subtle text-sm italic py-2">
        No proposed links involving your character
      </div>
    );
  }

  const handleAccept = (linkId: string) => {
    const doc = getYDoc();
    acceptCrossCharacterLink(doc, linkId, currentCharId);
  };

  const handleDismiss = (linkId: string) => {
    const doc = getYDoc();
    removeCrossCharacterLink(doc, linkId);
  };

  return (
    <div className="space-y-3">
      {myProposals.map((proposal) => {
        const otherCharId =
          proposal.sourceCharId === currentCharId ? proposal.targetCharId : proposal.sourceCharId;
        const otherChar = characters.find((c) => c.id === otherCharId);
        const otherName = otherChar?.name ?? 'Unknown';

        return (
          <div
            key={proposal.id}
            className="rounded-lg border border-sci-fi-border bg-sci-fi-surface/50 p-3"
          >
            <div className="text-sm font-medium text-sci-fi-text">Link with {otherName}</div>
            <div className="text-xs text-sci-fi-accent mt-0.5">{proposal.relationship}</div>
            {proposal.description && (
              <div className="text-xs text-subtle mt-1 italic">"{proposal.description}"</div>
            )}
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => handleAccept(proposal.id)}
                className="text-xs px-3 py-1 rounded bg-sci-fi-accent/20 text-sci-fi-accent hover:bg-sci-fi-accent/30 transition-colors"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => handleDismiss(proposal.id)}
                className="text-xs px-3 py-1 rounded bg-sci-fi-muted/20 text-subtle hover:bg-sci-fi-muted/30 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

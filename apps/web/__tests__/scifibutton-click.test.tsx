import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock lucide-react (used by other tests; keep consistent).
vi.mock('lucide-react', () => ({
  Download: () => <span data-testid="download-icon" />,
}));

import { SciFiButton } from '../components/ui/scifi/SciFiButton';
import { SciFiCard } from '../components/ui/scifi/SciFiCard';

describe('SciFiButton click behavior (regression guard for Stream A Bugs #2 and #3)', () => {
  it('fires onClick when clicked directly', () => {
    const onClick = vi.fn();
    render(<SciFiButton onClick={onClick}>Try to Join</SciFiButton>);
    fireEvent.click(screen.getByText('Try to Join'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('fires onClick when clicked inside SciFiCard footer (Bug #2 context)', () => {
    const onClick = vi.fn();
    render(
      <SciFiCard title="Army" footer={<SciFiButton onClick={onClick}>Try to Join</SciFiButton>}>
        <p>career description</p>
      </SciFiCard>,
    );
    fireEvent.click(screen.getByText('Try to Join'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('fires onClick for aging stat selection buttons (Bug #3 context)', () => {
    const togglePhysicalLoss = vi.fn();
    render(
      <SciFiButton theme="slate" scifiVariant="secondary" onClick={() => togglePhysicalLoss('STR')}>
        STR 5
      </SciFiButton>,
    );
    fireEvent.click(screen.getByText('STR 5'));
    expect(togglePhysicalLoss).toHaveBeenCalledWith('STR');
  });

  it('does not fire onClick when disabled', () => {
    const onClick = vi.fn();
    render(
      <SciFiButton onClick={onClick} disabled>
        Apply Aging Effects
      </SciFiButton>,
    );
    fireEvent.click(screen.getByText('Apply Aging Effects'));
    expect(onClick).not.toHaveBeenCalled();
  });
});

import { expect, type Page, test } from '@playwright/test';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';

// Two-browser regression for the cross-character dual-acceptance race (fu-chargen-4).
//
// Real path: both users create characters through the UI, the player joins via the
// session invite link, the GM panel's cross-character proposal refresh creates the
// link through the app's own `addCrossCharacterLink`, and both players accept via
// `CrossCharacterProposalList` (the player-to-player acceptance UI) with
// Promise.all so the two server commands race.
//
// Scaffolding:
// - The RAG service is not part of the e2e stack, so the cross-character link
//   generation request is fulfilled with a deterministic proposal from the spec.
// - Character graph nodes are normally created by finalizing a full lifepath.
//   To keep this test focused on the acceptance race (and not on two complete
//   career lifecycles), the two traveller nodes are pre-seeded with a direct
//   authenticated Yjs write against the Hocuspocus document. Everything after
//   that point (proposal creation, both accepts, edge materialization) is app code.

const API_URL = 'http://localhost:18122';
const WS_URL = 'ws://localhost:18121';
const PASSWORD = 'test-password-123';

interface E2EUser {
  email: string;
  name: string;
}

const GM_USER: E2EUser = { email: 'e2e-dual-gm@example.com', name: 'E2E GM' };
const PLAYER_USER: E2EUser = { email: 'e2e-dual-player@example.com', name: 'E2E Player' };

const GM_CHARACTER = 'E2E Dual GM Traveller';
const PLAYER_CHARACTER = 'E2E Dual Player Traveller';

interface DocState {
  links: Array<{
    id: string;
    sourceCharId: string;
    targetCharId: string;
    status: string;
    acceptedBy: string[];
  }>;
  charToNode: Map<string, string>;
  edges: Array<{ id: string; source: string; target: string }>;
}

test.describe('Chargen cross-character dual acceptance', () => {
  test('two players concurrently accept a proposal and the graph gains exactly one edge', async ({
    browser,
  }) => {
    test.setTimeout(180_000);

    await ensureUserRegistered(GM_USER);
    await ensureUserRegistered(PLAYER_USER);

    const gmContext = await browser.newContext();
    const playerContext = await browser.newContext();
    const gmPage = await gmContext.newPage();
    const playerPage = await playerContext.newPage();

    try {
      await login(gmPage, GM_USER);
      await login(playerPage, PLAYER_USER);

      // GM opens chargen first so session provisioning makes them the session GM.
      await gmPage.goto('/chargen');
      await expect(gmPage.getByTestId('chargen-wizard')).toHaveAttribute(
        'data-chargen-status',
        'background',
        { timeout: 30_000 },
      );
      await expect(gmPage.getByTestId('gm-panel-toggle')).toBeVisible({ timeout: 20_000 });

      await gmPage.getByTestId('create-character').click();
      await gmPage.locator('input[placeholder="Enter character name"]').fill(GM_CHARACTER);

      const inviteUrl = await gmPage.getByTestId('invite-url').inputValue();
      const sessionId = await gmPage.evaluate(() =>
        localStorage.getItem('highport_session_id:graph'),
      );
      expect(sessionId).toBeTruthy();

      // Player joins through the invite link (join page writes localStorage + sessionStorage).
      await playerPage.goto(inviteUrl);
      await expect(playerPage.getByTestId('join-session')).toBeVisible({ timeout: 30_000 });
      await playerPage.locator('#session-player-name').fill(PLAYER_CHARACTER);
      await playerPage.getByTestId('join-session').click();
      await expect(playerPage).toHaveURL(/\/chargen$/);
      await expect(playerPage.getByTestId('chargen-wizard')).toHaveAttribute(
        'data-chargen-status',
        'background',
        { timeout: 30_000 },
      );

      const gmCharId = await readActiveCharacterId(gmPage);
      const playerCharId = await readActiveCharacterId(playerPage);
      expect(gmCharId).not.toBe(playerCharId);

      // Both replicas must see both characters before the proposal is generated.
      await expect(gmPage.getByText(PLAYER_CHARACTER).first()).toBeVisible({ timeout: 20_000 });
      await expect(playerPage.getByText(GM_CHARACTER).first()).toBeVisible({ timeout: 20_000 });

      const gmToken = await readApiToken(gmPage);
      const playerToken = await readApiToken(playerPage);

      await seedCharacterNodes(gmPage, sessionId!, gmCharId, playerCharId, gmToken);

      // The GM panel refreshes proposals on open through the app's narrative API.
      // Fulfil that single external call so no RAG service is required.
      await gmPage.route('**/narrative/cross-character-links', async (route) => {
        const corsHeaders = {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'POST, OPTIONS',
          'access-control-allow-headers': 'content-type, authorization',
        };
        if (route.request().method() === 'OPTIONS') {
          await route.fulfill({ status: 204, headers: corsHeaders });
          return;
        }
        await route.fulfill({
          status: 200,
          headers: { ...corsHeaders, 'content-type': 'application/json' },
          body: JSON.stringify({
            proposals: [
              {
                source_char_id: gmCharId,
                target_char_id: playerCharId,
                relationship: 'ally',
                description: 'Shared a berth on the Highport docks.',
              },
            ],
          }),
        });
      });

      await gmPage.getByTestId('gm-panel-toggle').click();
      await expect(gmPage.getByTestId('gm-proposal-accept')).toBeVisible({ timeout: 20_000 });

      // Switch to player-to-player mode so both replicas surface the proposal.
      await gmPage.getByRole('radio', { name: /^Player-to-Player:/ }).click();
      await expect(gmPage.getByRole('radio', { name: /^Player-to-Player:/ })).toHaveAttribute(
        'aria-checked',
        'true',
      );
      await gmPage.getByTestId('gm-panel-toggle').click();

      await expect(gmPage.getByTestId('cross-character-accept')).toBeVisible({ timeout: 20_000 });
      await expect(playerPage.getByTestId('cross-character-accept')).toBeVisible({
        timeout: 20_000,
      });

      // Both sides accept as close to simultaneously as two pages allow.
      await Promise.all([
        gmPage.getByTestId('cross-character-accept').click(),
        playerPage.getByTestId('cross-character-accept').click(),
      ]);

      await expect(gmPage.getByTestId('cross-character-accept')).toHaveCount(0, {
        timeout: 20_000,
      });
      await expect(playerPage.getByTestId('cross-character-accept')).toHaveCount(0, {
        timeout: 20_000,
      });

      const expected = {
        status: 'accepted',
        acceptedBy: [gmCharId, playerCharId].sort(),
        edgesBetween: 1,
      };

      // Query the authoritative document through the API with each user's token.
      await expect
        .poll(
          async () =>
            summarize(await readDocStateAsync(sessionId!, gmToken), gmCharId, playerCharId),
          { timeout: 20_000, intervals: [250, 500, 1000, 2000] },
        )
        .toEqual(expected);

      await expect
        .poll(
          async () =>
            summarize(await readDocStateAsync(sessionId!, playerToken), gmCharId, playerCharId),
          { timeout: 20_000, intervals: [250, 500, 1000, 2000] },
        )
        .toEqual(expected);
    } finally {
      await gmContext.close();
      await playerContext.close();
    }
  });
});

function summarize(state: DocState, gmCharId: string, playerCharId: string) {
  const link = state.links.find(
    (entry) => entry.sourceCharId === gmCharId && entry.targetCharId === playerCharId,
  );
  const gmNode = state.charToNode.get(gmCharId);
  const playerNode = state.charToNode.get(playerCharId);
  const between = state.edges.filter(
    (edge) =>
      (edge.source === gmNode && edge.target === playerNode) ||
      (edge.source === playerNode && edge.target === gmNode),
  );
  return {
    status: link?.status ?? 'missing',
    acceptedBy: [...(link?.acceptedBy ?? [])].sort(),
    edgesBetween: between.length,
  };
}

async function ensureUserRegistered(user: E2EUser): Promise<void> {
  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: PASSWORD, name: user.name }),
  });
  if (!response.ok && response.status !== 409) {
    throw new Error(
      `Failed to register ${user.email}: ${response.status} ${await response.text()}`,
    );
  }
}

async function login(page: Page, user: E2EUser): Promise<void> {
  await page.goto('/login?callbackUrl=/campaigns');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/campaigns/);
  await expect(page.getByRole('heading', { name: 'Campaigns', exact: true })).toBeVisible({
    timeout: 20_000,
  });
}

async function readActiveCharacterId(page: Page): Promise<string> {
  const id = await page.evaluate(() => {
    const raw = localStorage.getItem('highport_active_character');
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null && 'characterId' in parsed
      ? String(parsed.characterId)
      : null;
  });
  expect(id).toBeTruthy();
  return id!;
}

async function readApiToken(page: Page): Promise<string> {
  const token = await page.evaluate(async () => {
    const response = await fetch('/api/auth/session');
    const session: unknown = await response.json();
    return typeof session === 'object' && session !== null && 'apiToken' in session
      ? String(session.apiToken)
      : null;
  });
  expect(token).toBeTruthy();
  return token!;
}

/**
 * Seed the two traveller graph nodes a finalized character would normally create.
 * Uses the GM's authenticated Hocuspocus connection; the write touches only the
 * `nodes` map, so chargen privilege enforcement is unaffected.
 */
async function seedCharacterNodes(
  page: Page,
  sessionId: string,
  gmCharId: string,
  playerCharId: string,
  apiToken: string,
): Promise<void> {
  const token = await page.evaluate(async () => {
    const response = await fetch('/api/auth/session');
    const session: unknown = await response.json();
    return typeof session === 'object' && session !== null && 'hocuspocusToken' in session
      ? String(session.hocuspocusToken)
      : null;
  });
  expect(token).toBeTruthy();

  const doc = new Y.Doc();
  const provider = new HocuspocusProvider({
    url: WS_URL,
    name: `${sessionId}:graph`,
    token: token!,
    document: doc,
  });

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('Hocuspocus provider sync timed out')),
        15_000,
      );
      provider.on('synced', () => {
        clearTimeout(timer);
        resolve();
      });
    });

    doc.transact(() => {
      const nodes = doc.getMap('nodes');
      const characters = [
        { charId: gmCharId, label: GM_CHARACTER },
        { charId: playerCharId, label: PLAYER_CHARACTER },
      ];
      characters.forEach(({ charId, label }, index) => {
        const nodeId = `e2e-${charId}`;
        const node = new Y.Map<unknown>();
        nodes.set(nodeId, node);
        node.set('id', nodeId);
        node.set('type', 'traveller');
        node.set('label', label);
        node.set('position', { x: index * 160, y: 0 });
        node.set('metadata', { chargenId: charId });
        node.set('locked', false);
        node.set('hidden', false);
        node.set('created_at', Date.now());
        node.set('created_by', 'e2e-dual-accept');
      });
    });

    // Wait until the server (and its update log) has both nodes before accepting.
    await expect
      .poll(async () => (await readDocStateAsync(sessionId, apiToken)).charToNode.size, {
        timeout: 15_000,
        intervals: [250, 500, 1000],
      })
      .toBeGreaterThanOrEqual(2);
  } finally {
    provider.destroy();
    doc.destroy();
  }
}

async function readDocStateAsync(sessionId: string, apiToken: string): Promise<DocState> {
  const response = await fetch(`${API_URL}/api/doc/${encodeURIComponent(sessionId)}/graph`, {
    headers: { Authorization: `Bearer ${apiToken}` },
  });
  expect(response.ok).toBe(true);

  const doc = new Y.Doc();
  try {
    Y.applyUpdate(doc, new Uint8Array(await response.arrayBuffer()));

    const links: DocState['links'] = [];
    const linkMap = doc.getMap('chargen').get('crossCharacterLinks');
    if (linkMap instanceof Y.Map) {
      linkMap.forEach((entry, id) => {
        if (!(entry instanceof Y.Map)) return;
        const acceptedBy = entry.get('acceptedBy');
        links.push({
          id: String(id),
          sourceCharId: String(entry.get('sourceCharId')),
          targetCharId: String(entry.get('targetCharId')),
          status: String(entry.get('status')),
          acceptedBy: acceptedBy instanceof Y.Map ? Array.from(acceptedBy.keys()) : [],
        });
      });
    }

    const charToNode = new Map<string, string>();
    doc.getMap('nodes').forEach((entry, id) => {
      if (!(entry instanceof Y.Map)) return;
      const metadata = entry.get('metadata');
      if (typeof metadata === 'object' && metadata !== null && 'chargenId' in metadata) {
        charToNode.set(String(metadata.chargenId), String(id));
      }
    });

    const edges: DocState['edges'] = [];
    doc.getMap('edges').forEach((entry, id) => {
      if (!(entry instanceof Y.Map)) return;
      edges.push({
        id: String(id),
        source: String(entry.get('source_id')),
        target: String(entry.get('target_id')),
      });
    });

    return { links, charToNode, edges };
  } finally {
    doc.destroy();
  }
}

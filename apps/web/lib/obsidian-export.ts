import type { GraphNode } from '@highport/shared/types/graph';
import JSZip from 'jszip';

export interface ObsidianVaultEntity {
  id: string;
  slug: string;
  label: string;
  type: GraphNode['type'];
  checksum: string;
}

export interface ObsidianVaultManifest {
  version: 1;
  exportedAt: string;
  campaignId: string;
  entities: ObsidianVaultEntity[];
}

interface ExportEntry {
  node: GraphNode;
  slug: string;
  markdown: string;
  checksum: string;
}

const FIXED_ZIP_DATE = new Date('2000-01-01T00:00:00.000Z');

function safeString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim());
}

function safeNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function yamlValue(value: string): string {
  return JSON.stringify(value);
}

function yamlArray(values: string[]): string {
  if (values.length === 0) {
    return '[]';
  }
  return `\n${values.map((value) => `  - ${yamlValue(value)}`).join('\n')}`;
}

function isoTimestamp(value: number | undefined, fallback: number): string {
  return new Date(value ?? fallback).toISOString();
}

function slugify(input: string): string {
  const slug = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'untitled';
}

function resolveBaseSlug(node: GraphNode): string {
  const metadata = (node.metadata ?? {}) as Record<string, unknown>;
  const explicitSlug = safeString(metadata.slug).trim();
  return slugify(explicitSlug || node.label);
}

function buildMarkdown(node: GraphNode): string {
  const metadata = (node.metadata ?? {}) as Record<string, unknown>;
  const description = safeString(metadata.description);
  const content = safeString(metadata.content);
  const tags = safeStringArray(metadata.tags);
  const aliases = safeStringArray(metadata.aliases);
  const updatedAt = safeNumber(metadata.updated_at);

  const frontmatter = [
    '---',
    `id: ${yamlValue(node.id)}`,
    `type: ${yamlValue(node.type)}`,
    `tags: ${yamlArray(tags)}`,
    `aliases: ${yamlArray(aliases)}`,
    `created_at: ${yamlValue(isoTimestamp(node.created_at, node.created_at))}`,
    `updated_at: ${yamlValue(isoTimestamp(updatedAt, node.created_at))}`,
    '---',
  ].join('\n');

  return [
    frontmatter,
    '',
    `# ${node.label}`,
    '',
    '## Description',
    '',
    description,
    '',
    '## Content',
    '',
    content,
    '',
  ].join('\n');
}

function simpleChecksum(input: string): string {
  // FNV-1a 32-bit checksum for deterministic lightweight hashing.
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function buildEntries(nodes: GraphNode[]): ExportEntry[] {
  const preEntries = [...nodes]
    .map((node) => ({ node, baseSlug: resolveBaseSlug(node) }))
    .sort((a, b) => {
      const slugOrder = a.baseSlug.localeCompare(b.baseSlug);
      if (slugOrder !== 0) return slugOrder;
      return a.node.id.localeCompare(b.node.id);
    });

  const slugCounts = new Map<string, number>();

  return preEntries.map(({ node, baseSlug }) => {
    const count = slugCounts.get(baseSlug) ?? 0;
    slugCounts.set(baseSlug, count + 1);
    const slug = count === 0 ? baseSlug : `${baseSlug}-${count + 1}`;
    const markdown = buildMarkdown(node);
    return {
      node,
      slug,
      markdown,
      checksum: simpleChecksum(markdown),
    };
  });
}

export function createObsidianManifest(
  entries: ExportEntry[],
  campaignId: string,
  exportedAt: string,
): ObsidianVaultManifest {
  return {
    version: 1,
    exportedAt,
    campaignId,
    entities: entries.map((entry) => ({
      id: entry.node.id,
      slug: entry.slug,
      label: entry.node.label,
      type: entry.node.type,
      checksum: entry.checksum,
    })),
  };
}

export async function exportObsidianVault(
  nodes: GraphNode[],
  campaignId: string,
  exportedAt: string = new Date(0).toISOString(),
): Promise<Uint8Array> {
  const zip = new JSZip();
  const entries = buildEntries(nodes);

  for (const entry of entries) {
    zip.file(`notes/${entry.slug}.md`, entry.markdown, {
      date: FIXED_ZIP_DATE,
      createFolders: true,
    });
  }

  const manifest = createObsidianManifest(entries, campaignId, exportedAt);
  zip.file('manifest.json', JSON.stringify(manifest, null, 2), {
    date: FIXED_ZIP_DATE,
    createFolders: false,
  });

  return zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });
}

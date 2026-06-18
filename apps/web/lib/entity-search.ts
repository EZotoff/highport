import type { NodeType, GraphNode } from '@highport/shared/types/graph';

export interface SearchEntity {
  id: string;
  label: string;
  type: NodeType;
  description: string;
  content: string;
  tags: string[];
  aliases: string[];
}

export interface EntitySearchFilters {
  type?: NodeType | 'all';
  tag?: string | null;
  limit?: number;
}

export type EntitySearchMatchField = 'label' | 'description' | 'content' | 'tags' | 'aliases';

export interface EntitySearchResult {
  entity: SearchEntity;
  score: number;
  matchedFields: EntitySearchMatchField[];
}

const WEIGHTS: Record<EntitySearchMatchField, number> = {
  label: 120,
  aliases: 100,
  tags: 90,
  description: 70,
  content: 50,
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function scoreMatch(haystack: string, query: string, weight: number): number {
  const idx = haystack.indexOf(query);
  if (idx < 0) return 0;
  const proximityBonus = Math.max(0, 20 - idx);
  return weight + proximityBonus;
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim());
}

function parseString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function graphNodeToSearchEntity(node: GraphNode): SearchEntity {
  const metadata = node.metadata ?? {};
  const meta = metadata as Record<string, unknown>;

  return {
    id: node.id,
    label: node.label,
    type: node.type,
    description: parseString(meta.description),
    content: parseString(meta.content),
    tags: parseStringArray(meta.tags),
    aliases: parseStringArray(meta.aliases),
  };
}

export function searchEntities(
  entities: SearchEntity[],
  query: string,
  filters: EntitySearchFilters = {},
): EntitySearchResult[] {
  const normalizedQuery = normalize(query);
  const normalizedTag = normalize(filters.tag ?? '');

  const filtered = entities.filter((entity) => {
    if (filters.type && filters.type !== 'all' && entity.type !== filters.type) {
      return false;
    }

    if (normalizedTag) {
      const hasTag = entity.tags.some((tag) => normalize(tag) === normalizedTag);
      if (!hasTag) return false;
    }

    return true;
  });

  const orderedIfEmpty = [...filtered].sort((a, b) => a.label.localeCompare(b.label));
  if (!normalizedQuery) {
    return orderedIfEmpty.map((entity) => ({ entity, score: 0, matchedFields: [] }));
  }

  const results: EntitySearchResult[] = [];

  for (const entity of filtered) {
    let score = 0;
    const matchedFields: EntitySearchMatchField[] = [];

    const labelScore = scoreMatch(normalize(entity.label), normalizedQuery, WEIGHTS.label);
    if (labelScore > 0) {
      matchedFields.push('label');
      score += labelScore;
    }

    const descriptionScore = scoreMatch(
      normalize(entity.description),
      normalizedQuery,
      WEIGHTS.description,
    );
    if (descriptionScore > 0) {
      matchedFields.push('description');
      score += descriptionScore;
    }

    const contentScore = scoreMatch(normalize(entity.content), normalizedQuery, WEIGHTS.content);
    if (contentScore > 0) {
      matchedFields.push('content');
      score += contentScore;
    }

    const bestTagScore = Math.max(
      0,
      ...entity.tags.map((tag) => scoreMatch(normalize(tag), normalizedQuery, WEIGHTS.tags)),
    );
    if (bestTagScore > 0) {
      matchedFields.push('tags');
      score += bestTagScore;
    }

    const bestAliasScore = Math.max(
      0,
      ...entity.aliases.map((alias) =>
        scoreMatch(normalize(alias), normalizedQuery, WEIGHTS.aliases),
      ),
    );
    if (bestAliasScore > 0) {
      matchedFields.push('aliases');
      score += bestAliasScore;
    }

    if (score > 0) {
      results.push({ entity, score, matchedFields });
    }
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.entity.label.localeCompare(b.entity.label);
  });

  if (filters.limit && filters.limit > 0) {
    return results.slice(0, filters.limit);
  }

  return results;
}

export function getTagIndex(entities: SearchEntity[]): Map<string, number> {
  const index = new Map<string, number>();

  for (const entity of entities) {
    const uniqueEntityTags = new Set(entity.tags.map((tag) => normalize(tag)).filter(Boolean));
    for (const tag of uniqueEntityTags) {
      index.set(tag, (index.get(tag) ?? 0) + 1);
    }
  }

  return index;
}

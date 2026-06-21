'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { SciFiButton } from '@/components/ui/scifi';
import type { SpawnedEntityRef } from '../../lib/chargen/types';

interface ConnectionSuggestion {
  source: string;
  target: string;
  relationship: string;
  description: string;
}

interface ConnectionSuggestionsProps {
  entities: SpawnedEntityRef[];
  characterName: string;
  careerHistory: string[];
  onAccept: (connection: ConnectionSuggestion) => void;
}

interface ConnectionSuggestionsError {
  message: string;
  status?: number;
  retryable: boolean;
}

const RAG_SERVICE_URL = process.env.NEXT_PUBLIC_RAG_SERVICE_URL || 'http://localhost:18124';

export default function ConnectionSuggestions({
  entities,
  characterName,
  careerHistory,
  onAccept,
}: ConnectionSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<ConnectionSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ConnectionSuggestionsError | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const fetchSuggestions = useCallback(async () => {
    if (entities.length < 2) {
      setSuggestions([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const currentCareer = careerHistory[careerHistory.length - 1] || null;

      const response = await fetch(`${RAG_SERVICE_URL}/narrative/suggest-connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entities: entities.map((e) => ({
            id: e.graphNodeId,
            name: e.name,
            type: e.type,
            career: currentCareer,
          })),
          character: {
            name: characterName,
            career_history: careerHistory,
          },
        }),
      });

      if (!response.ok) {
        setError({
          message: `RAG service returned ${response.status} ${response.statusText}`,
          status: response.status,
          retryable: response.status >= 500 || response.status === 0,
        });
        return;
      }

      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (e) {
      const isNetwork =
        e instanceof TypeError && e.message.toLowerCase().includes('failed to fetch');
      setError({
        message: isNetwork
          ? 'Cannot reach RAG service. Is it running on :18124?'
          : e instanceof Error
            ? e.message
            : 'Unknown error fetching suggestions',
        retryable: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [entities, characterName, careerHistory]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  const handleDismiss = (suggestion: ConnectionSuggestion) => {
    const key = `${suggestion.source}-${suggestion.target}`;
    setDismissed((prev) => new Set([...prev, key]));
  };

  const visibleSuggestions = suggestions.filter((s) => !dismissed.has(`${s.source}-${s.target}`));

  if (visibleSuggestions.length === 0 && !isLoading && !error) {
    return null;
  }

  return (
    <div className="mt-6 p-4 bg-purple-900/20 border border-purple-800/50 rounded-lg">
      <h4 className="text-sm font-bold text-purple-300 mb-3">✨ Suggested Connections</h4>

      {error && !isLoading && visibleSuggestions.length === 0 ? (
        <div
          role="alert"
          className="p-3 bg-red-900/20 border border-red-800/50 rounded text-sm text-red-300"
        >
          <div className="font-medium mb-1">Couldn&rsquo;t load suggestions</div>
          <div className="text-xs text-red-400/80 mb-2">{error.message}</div>
          {error.retryable && (
            <SciFiButton
              theme="slate"
              scifiVariant="ghost"
              size="sm"
              onClick={fetchSuggestions}
              aria-label="Retry loading suggestions"
            >
              ↻ Retry
            </SciFiButton>
          )}
        </div>
      ) : isLoading ? (
        <div className="text-sm text-subtle animate-pulse">Analyzing relationships...</div>
      ) : (
        <div className="space-y-3">
          {visibleSuggestions.map((suggestion) => {
            const sourceEntity = entities.find((e) => e.graphNodeId === suggestion.source);
            const targetEntity = entities.find((e) => e.graphNodeId === suggestion.target);
            const suggestionKey = `${suggestion.source}-${suggestion.target}`;

            return (
              <div
                key={suggestionKey}
                className="p-3 bg-zinc-900/50 border border-zinc-800 rounded"
              >
                <div className="flex items-center gap-2 text-sm font-medium text-default mb-1">
                  <span>{sourceEntity?.name || suggestion.source}</span>
                  <span className="text-purple-400">→</span>
                  <span>{targetEntity?.name || suggestion.target}</span>
                </div>
                <div className="text-xs text-subtle mb-2">{suggestion.description}</div>
                <div className="flex gap-2">
                  <SciFiButton
                    theme="violet"
                    scifiVariant="outline"
                    size="sm"
                    onClick={() => onAccept(suggestion)}
                  >
                    Add Connection
                  </SciFiButton>
                  <SciFiButton
                    theme="slate"
                    scifiVariant="ghost"
                    size="sm"
                    onClick={() => handleDismiss(suggestion)}
                  >
                    Dismiss
                  </SciFiButton>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

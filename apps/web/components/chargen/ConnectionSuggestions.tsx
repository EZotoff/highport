'use client';

import React, { useState, useEffect } from 'react';
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

const RAG_SERVICE_URL = process.env.NEXT_PUBLIC_RAG_SERVICE_URL || 'http://localhost:8000';

export default function ConnectionSuggestions({
  entities,
  characterName,
  careerHistory,
  onAccept,
}: ConnectionSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<ConnectionSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (entities.length < 2) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      setIsLoading(true);
      try {
        // Use the most recent career as the context for spawned entities
        const currentCareer = careerHistory[careerHistory.length - 1] || null;
        
        const response = await fetch(`${RAG_SERVICE_URL}/narrative/suggest-connections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entities: entities.map(e => ({
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

        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.suggestions || []);
        }
      } catch (e) {
        // Silently fail - suggestions are optional
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [entities, characterName, careerHistory]);

  const handleDismiss = (suggestion: ConnectionSuggestion) => {
    const key = `${suggestion.source}-${suggestion.target}`;
    setDismissed(prev => new Set([...prev, key]));
  };

  const visibleSuggestions = suggestions.filter(
    s => !dismissed.has(`${s.source}-${s.target}`)
  );

  if (visibleSuggestions.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="mt-6 p-4 bg-purple-900/20 border border-purple-800/50 rounded-lg">
      <h4 className="text-sm font-bold text-purple-300 mb-3">
        ✨ Suggested Connections
      </h4>

      {isLoading ? (
        <div className="text-sm text-subtle animate-pulse">
          Analyzing relationships...
        </div>
      ) : (
        <div className="space-y-3">
          {visibleSuggestions.map((suggestion, i) => {
            const sourceEntity = entities.find(e => e.graphNodeId === suggestion.source);
            const targetEntity = entities.find(e => e.graphNodeId === suggestion.target);

            return (
              <div
                key={i}
                className="p-3 bg-zinc-900/50 border border-zinc-800 rounded"
              >
                <div className="flex items-center gap-2 text-sm font-medium text-default mb-1">
                  <span>{sourceEntity?.name || suggestion.source}</span>
                  <span className="text-purple-400">→</span>
                  <span>{targetEntity?.name || suggestion.target}</span>
                </div>
                <div className="text-xs text-subtle mb-2">
                  {suggestion.description}
                </div>
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

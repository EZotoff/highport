'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { SciFiInput, SciFiButton, SciFiSelect } from '@/components/ui/scifi';
import { THEME_HEX, TEXT_COLORS } from '@/lib/design-system/themeUtils';
import { getOrCreateUser } from '../../lib/identity';
import type {
  PortraitRecord,
  PortraitSearchResult,
  PortraitTags,
  PortraitEntityType,
} from '@highport/shared/types/portrait';
import { Search, Loader2, Image as ImageIcon } from 'lucide-react';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3012';

interface PortraitLibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  onSelect: (portrait: PortraitRecord) => void;
  filterTags?: Partial<PortraitTags>;
}

function LazyPortraitImage({ src, alt }: { src?: string; alt: string }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-zinc-900 overflow-hidden">
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div 
            className="absolute inset-0 animate-pulse bg-zinc-800/50"
            style={{ 
              borderColor: THEME_HEX.cyan + '26',
              borderWidth: '1px'
            }}
          />
          <ImageIcon className="w-8 h-8 opacity-20" style={{ color: THEME_HEX.cyan }} />
        </div>
      )}

      {isVisible && src && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
}

export function PortraitLibrary({
  open,
  onOpenChange,
  campaignId,
  onSelect,
  filterTags,
}: PortraitLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [entityType, setEntityType] = useState<string>('all');
  const [gender, setGender] = useState<string>('all');
  const [careerType, setCareerType] = useState<string>('all');
  const [results, setResults] = useState<PortraitSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizeImageUrl = useCallback((imageUrl?: string): string | undefined => {
    if (!imageUrl) return undefined;
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    return `${SERVER_URL}${imageUrl}`;
  }, []);

  const fetchPortraits = useCallback(async () => {
    if (!campaignId || !open) return;

    setIsLoading(true);
    setError(null);
    const user = getOrCreateUser();

    try {
      const tags: any = {
        ...filterTags,
      };

      if (entityType !== 'all') {
        tags.story = {
          ...(tags.story || {}),
          entity_type: entityType as PortraitEntityType,
        };
      }

      if (gender !== 'all') {
        tags.demographics = {
          ...(tags.demographics || {}),
          gender: gender as any,
        };
      }

      if (careerType !== 'all') {
        tags.career = {
          ...(tags.career || {}),
          career_type: careerType as any,
        };
      }

      if (searchQuery) {
        tags.freeform = [...(tags.freeform || []), searchQuery];
      }

      const params = new URLSearchParams({
        campaign_id: campaignId,
        tags: JSON.stringify(tags),
      });

      const response = await fetch(`${SERVER_URL}/api/portraits/search?${params.toString()}`, {
        headers: {
          'X-User-Id': user.userId,
        },
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = (await response.json()) as PortraitSearchResult[];
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [campaignId, searchQuery, entityType, gender, careerType, filterTags, open]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPortraits();
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchPortraits]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col bg-zinc-950 border-zinc-800">
        <DialogHeader>
          <DialogTitle style={{ color: THEME_HEX.cyan }}>Portrait Library</DialogTitle>
          <DialogDescription style={{ color: TEXT_COLORS.subtle }}>
            Browse and select portraits from your campaign collection.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4 flex-1 overflow-hidden">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label 
                className="text-xs font-bold uppercase tracking-widest mb-1 block"
                style={{ color: TEXT_COLORS.label }}
              >
                Search Tags
              </label>
              <div className="relative">
                <Search 
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
                  style={{ color: THEME_HEX.cyan }}
                />
                <SciFiInput
                  placeholder="Enter keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="w-40">
              <label 
                className="text-xs font-bold uppercase tracking-widest mb-1 block"
                style={{ color: TEXT_COLORS.label }}
              >
                Type
              </label>
              <SciFiSelect
                value={entityType}
                onValueChange={setEntityType}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'traveller', label: 'Traveller' },
                  { value: 'npc', label: 'NPC' },
                ]}
              />
            </div>

            <div className="w-40">
              <label 
                className="text-xs font-bold uppercase tracking-widest mb-1 block"
                style={{ color: TEXT_COLORS.label }}
              >
                Gender
              </label>
              <SciFiSelect
                value={gender}
                onValueChange={setGender}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'nonbinary', label: 'Non-binary' },
                  { value: 'ambiguous', label: 'Ambiguous' },
                ]}
              />
            </div>

            <div className="w-40">
              <label 
                className="text-xs font-bold uppercase tracking-widest mb-1 block"
                style={{ color: TEXT_COLORS.label }}
              >
                Career
              </label>
              <SciFiSelect
                value={careerType}
                onValueChange={setCareerType}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'navy', label: 'Navy' },
                  { value: 'marines', label: 'Marines' },
                  { value: 'scout', label: 'Scout' },
                  { value: 'merchant', label: 'Merchant' },
                  { value: 'rogue', label: 'Rogue' },
                  { value: 'noble', label: 'Noble' },
                  { value: 'agent', label: 'Agent' },
                ]}
              />
            </div>

            <SciFiButton
              onClick={() => fetchPortraits()}
              theme="cyan"
              scifiVariant="primary"
              className="px-6"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </SciFiButton>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-[400px]">
            {isLoading && results.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin" style={{ color: THEME_HEX.cyan }} />
                <p style={{ color: TEXT_COLORS.subtle }}>Searching the archives...</p>
              </div>
            ) : error ? (
              <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
                <div className="text-red-400 font-mono">ERROR::SEARCH_FAILED</div>
                <p style={{ color: TEXT_COLORS.subtle }}>{error}</p>
                <SciFiButton theme="red" scifiVariant="secondary" onClick={() => fetchPortraits()}>
                  Retry Connection
                </SciFiButton>
              </div>
            ) : results.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-4 opacity-50">
                <ImageIcon className="w-16 h-16" style={{ color: THEME_HEX.slate }} />
                <p style={{ color: TEXT_COLORS.subtle }}>No portraits matched your search criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-1">
                {results.map((result) => (
                  <button
                    key={result.portrait.id}
                    onClick={() => onSelect(result.portrait)}
                    className="group relative aspect-square rounded-lg overflow-hidden border transition-all duration-300 hover:scale-105 active:scale-95"
                    style={{ 
                      borderColor: THEME_HEX.cyan + '4d',
                      boxShadow: `0 0 0 0 ${THEME_HEX.cyan}00`
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = THEME_HEX.cyan;
                      e.currentTarget.style.boxShadow = `0 0 15px ${THEME_HEX.cyan}4d`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = THEME_HEX.cyan + '4d';
                      e.currentTarget.style.boxShadow = `0 0 0 0 ${THEME_HEX.cyan}00`;
                    }}
                  >
                    <LazyPortraitImage
                      src={normalizeImageUrl(result.portrait.image_url)}
                      alt="Portrait"
                    />
                    
                    <div 
                      className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-bold backdrop-blur-md border"
                      style={{ 
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        color: THEME_HEX.cyan,
                        borderColor: THEME_HEX.cyan + '4d'
                      }}
                    >
                      {Math.round(result.score * 100)}%
                    </div>

                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                      <div className="text-[10px] uppercase tracking-tighter truncate" style={{ color: THEME_HEX.cyan }}>
                        {result.portrait.tags.story.entity_type}
                      </div>
                      <div className="text-[9px] truncate" style={{ color: TEXT_COLORS.subtle }}>
                        {result.portrait.tags.career?.career_type || 'Unknown Career'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

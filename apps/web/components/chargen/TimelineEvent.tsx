import React, { memo } from 'react';
import { Info, AlertTriangle } from 'lucide-react';
import type { CareerEvent, CareerMishap } from '@planeshift/mgt2e';
import { THEME_HEX } from '@/lib/design-system/themeUtils';

interface TimelineEventProps {
  event?: CareerEvent;
  eventDescription?: string;
  mishap?: CareerMishap;
}

export const TimelineEvent = memo(function TimelineEvent({ event, eventDescription, mishap }: TimelineEventProps) {
  if (mishap) {
    const description = mishap.description || 'Mishap occurred';

    return (
      <div className="flex items-start gap-2 group relative" style={{ color: THEME_HEX.red }}>
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <span className="text-xs line-clamp-2 leading-tight">{description}</span>
        
        <div 
          className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-48 p-2 rounded text-xs text-white z-50"
          style={{
            backgroundColor: '#1a1f2e',
            border: `1px solid ${THEME_HEX.red}30`,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
          }}
        >
          {description}
        </div>
      </div>
    );
  }

  if (event || eventDescription) {
    const description = eventDescription || event?.description || 'Life event';

    return (
      <div className="flex items-start gap-2 group relative" style={{ color: THEME_HEX.cyan }}>
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <span className="text-xs line-clamp-2 leading-tight">{description}</span>
        
        <div 
          className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-48 p-2 rounded text-xs text-white z-50"
          style={{
            backgroundColor: '#1a1f2e',
            border: `1px solid ${THEME_HEX.cyan}30`,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
          }}
        >
          {description}
        </div>
      </div>
    );
  }

  return null;
});

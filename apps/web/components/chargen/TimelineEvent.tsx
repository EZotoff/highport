import React from 'react';
import { Info, AlertTriangle } from 'lucide-react';
import type { CareerEvent, CareerMishap } from '@planeshift/mgt2e';

interface TimelineEventProps {
  event?: CareerEvent;
  eventDescription?: string;
  mishap?: CareerMishap;
}

export function TimelineEvent({ event, eventDescription, mishap }: TimelineEventProps) {
  if (mishap) {
    // Determine mishap description - prefer explicitly passed string, fallback to object property
    const description = mishap.description || 'Mishap occurred';

    return (
      <div className="flex items-start gap-2 text-red-400 group relative">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <span className="text-xs line-clamp-2 leading-tight">{description}</span>
        
        {/* Tooltip on hover */}
        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-gray-900 border border-gray-700 rounded text-xs text-white z-50 shadow-xl">
          {description}
        </div>
      </div>
    );
  }

  if (event || eventDescription) {
    const description = eventDescription || event?.description || 'Life event';

    return (
      <div className="flex items-start gap-2 text-blue-300 group relative">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <span className="text-xs line-clamp-2 leading-tight">{description}</span>
        
        {/* Tooltip on hover */}
        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-gray-900 border border-gray-700 rounded text-xs text-white z-50 shadow-xl">
          {description}
        </div>
      </div>
    );
  }

  return null;
}

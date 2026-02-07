'use client';

import React, { useEffect } from 'react';
import { useChargenNotifications, ExtendedNotification, ChargenNotificationType } from '../../lib/chargen/useChargenNotifications';
import { X, UserPlus, Dice5, Bell, Link2, CheckCircle, Calendar, Star } from 'lucide-react';
import { SciFiButton } from '@/components/ui/scifi';

interface ChargenNotificationsProps {
  className?: string;
}

export default function ChargenNotifications({ className }: ChargenNotificationsProps) {
  const { notifications, dismissNotification } = useChargenNotifications();

  return (
    <div className={`fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none ${className}`}>
      {notifications.map((notification) => (
        <NotificationToast 
          key={notification.id} 
          notification={notification} 
          onDismiss={() => dismissNotification(notification.id)} 
        />
      ))}
    </div>
  );
}

function NotificationToast({ 
  notification, 
  onDismiss 
}: { 
  notification: ExtendedNotification; 
  onDismiss: () => void; 
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const { data } = notification;

  return (
    <div className="pointer-events-auto w-80 bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl shadow-black/50 overflow-hidden animate-in slide-in-from-right-full fade-in duration-300">
      <div className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <NotificationContent data={data} />
          </div>
          <button 
            type="button"
            aria-label="Dismiss notification"
            onClick={onDismiss}
            className="text-subtle hover:brightness-125 transition-colors min-w-[44px] min-h-[44px] rounded focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus-visible:ring-2"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      
      <div className="h-0.5 w-full bg-zinc-900">
         <div className="h-full bg-blue-500/50 animate-[shrink_5s_linear_forwards] origin-left" />
      </div>
    </div>
  );
}

function NotificationContent({ data }: { data: ChargenNotificationType }) {
  switch (data.type) {
    case 'player_joined':
      return (
        <div>
          <div className="flex items-center gap-2 text-default text-sm font-medium">
            <UserPlus className="w-4 h-4" />
            <span>Player Joined</span>
          </div>
          <p className="text-subtle text-xs mt-1">
            <span className="text-blue-400">{data.playerName}</span> has joined the session.
          </p>
        </div>
      );
    case 'character_started':
      return (
        <div>
          <div className="flex items-center gap-2 text-default text-sm font-medium">
            <Dice5 className="w-4 h-4" />
            <span>Character Started</span>
          </div>
          <p className="text-subtle text-xs mt-1">
            <span className="text-blue-400">{data.playerName}</span> started creating <span className="text-default">"{data.characterName}"</span>.
          </p>
        </div>
      );
    case 'entity_spawned':
      return (
        <div>
          <div className="flex items-center gap-2 text-default text-sm font-medium">
            <Bell className="w-4 h-4" />
            <span>New Entity Spawned</span>
          </div>
          <p className="text-subtle text-xs mt-1">
            {data.creatorName} created {data.entityType}: <span className="text-default font-medium">{data.entityName}</span>
          </p>
          <SciFiButton theme="slate" scifiVariant="ghost" size="sm">
            View in Pool
          </SciFiButton>
        </div>
      );
    case 'connection_requested':
      return (
        <div>
          <div className="flex items-center gap-2 text-default text-sm font-medium">
            <Link2 className="w-4 h-4" />
            <span>Connection Requested</span>
          </div>
          <p className="text-subtle text-xs mt-1">
            <span className="text-blue-400">{data.requesterName}</span> wants to connect with <span className="text-default">{data.entityName}</span>.
          </p>
        </div>
      );
    case 'connection_approved':
      return (
        <div>
          <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            <span>Connection Approved</span>
          </div>
          <p className="text-subtle text-xs mt-1">
            Connection established between <span className="text-default">{data.characterName}</span> and <span className="text-default">{data.entityName}</span>.
          </p>
        </div>
      );
    case 'term_completed':
      return (
        <div>
          <div className="flex items-center gap-2 text-default text-sm font-medium">
            <Calendar className="w-4 h-4" />
            <span>Term Completed</span>
          </div>
          <p className="text-subtle text-xs mt-1">
            <span className="text-blue-400">{data.playerName}</span> finished Term {data.termNumber}.
          </p>
        </div>
      );
    case 'character_completed':
      return (
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
            <Star className="w-4 h-4" />
            <span>Character Finalized</span>
          </div>
          <p className="text-subtle text-xs mt-1">
            <span className="text-blue-400">{data.playerName}</span> has completed their character <span className="text-default">"{data.characterName}"</span>!
          </p>
        </div>
      );
  }
}

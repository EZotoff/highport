import { useState, useEffect, useCallback } from 'react';
import * as Y from 'yjs';
import { getYDoc } from '../ydoc';
import { 
  getCharactersMap, 
  getEntityPoolMap, 
  getConnectionRequestsArray,
  yMapToCharacter,
  yMapToEntity,
  getEntityFromPool,
  getCharacter
} from './state';
import { getOrCreateUser } from '../identity';
import type { 
  ConnectionRequest 
} from './types';

export type ChargenNotificationType = 
  | { type: 'player_joined'; playerName: string }
  | { type: 'character_started'; playerName: string; characterName: string }
  | { type: 'entity_spawned'; entityName: string; entityType: string; creatorName: string }
  | { type: 'connection_requested'; requesterName: string; entityName: string }
  | { type: 'connection_approved'; entityName: string; characterName: string }
  | { type: 'character_completed'; playerName: string; characterName: string }
  | { type: 'term_completed'; playerName: string; termNumber: number };

export interface ExtendedNotification {
  id: string;
  data: ChargenNotificationType;
  timestamp: number;
  read: boolean;
}

export function useChargenNotifications() {
  const [notifications, setNotifications] = useState<ExtendedNotification[]>([]);
  const currentUser = getOrCreateUser();

  const addNotification = useCallback((data: ChargenNotificationType) => {
    const newNotification: ExtendedNotification = {
      id: Math.random().toString(36).substring(7),
      data,
      timestamp: Date.now(),
      read: false,
    };
    
    setNotifications(prev => [newNotification, ...prev].slice(0, 50));
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  useEffect(() => {
    const doc = getYDoc();
    const characters = getCharactersMap(doc);
    const entityPool = getEntityPoolMap(doc);
    const connectionRequests = getConnectionRequestsArray(doc);

    const deepCharactersObserver = (events: Y.YEvent<any>[]) => {
      events.forEach(event => {
        if (event.transaction.local) return;

        if (event.target === characters) {
            event.changes.keys.forEach((change, key) => {
                if (change.action === 'add') {
                    const charMap = characters.get(key) as Y.Map<unknown>;
                    const char = yMapToCharacter(charMap);
                    if (char.playerId !== currentUser.userId) {
                         addNotification({
                             type: 'player_joined',
                             playerName: char.name || 'New Player' 
                         });
                    }
                }
            });
        } 
        else if (event.target.parent === characters) {
             const charMap = event.target as Y.Map<unknown>;
             const char = yMapToCharacter(charMap);
             if (char.playerId === currentUser.userId) return;

             if (event instanceof Y.YMapEvent) {
                 event.changes.keys.forEach((change, key) => {
                     if (key === 'status' && char.status === 'finalized') {
                         addNotification({
                             type: 'character_completed',
                             playerName: char.name,
                             characterName: char.name
                         });
                     }
                     if (key === 'terms') {
                         if (char.terms.length > 0) {
                             const lastTerm = char.terms[char.terms.length - 1];
                             addNotification({
                                 type: 'term_completed',
                                 playerName: char.name,
                                 termNumber: lastTerm.termNumber
                             });
                         }
                     }
                 });
             }
        }
      });
    };

    const entityPoolObserver = (event: Y.YMapEvent<Y.Map<unknown>>) => {
      if (event.transaction.local) return;

      event.changes.keys.forEach((change, key) => {
        if (change.action === 'add') {
          const entityMap = entityPool.get(key);
          if (entityMap) {
            const entity = yMapToEntity(entityMap);
            addNotification({
              type: 'entity_spawned',
              entityName: entity.name,
              entityType: entity.type,
              creatorName: 'A player' 
            });
          }
        }
      });
    };

    const connectionRequestsObserver = (event: Y.YArrayEvent<unknown>) => {
      if (event.transaction.local) return;

      if (event.changes.added.size > 0) {
         let index = 0;
         event.changes.delta.forEach((op) => {
             if (op.retain) {
                 index += op.retain;
             }
             if (op.insert) {
                 const inserted = op.insert as ConnectionRequest[];
                 if (Array.isArray(inserted)) {
                     inserted.forEach(req => {
                         const entity = getEntityFromPool(doc, req.entityId);
                         const entityName = entity?.name || 'Unknown Entity';
                         
                         const requesterChar = getCharacter(doc, req.requesterCharId);
                         const requesterName = requesterChar?.name || 'Unknown Character';

                         addNotification({
                             type: 'connection_requested',
                             requesterName,
                             entityName
                         });
                     });
                 }
                 index += (op.insert as any[]).length;
             }
         });
      }
    };

    characters.observeDeep(deepCharactersObserver);
    entityPool.observe(entityPoolObserver);
    connectionRequests.observe(connectionRequestsObserver);

    return () => {
      characters.unobserveDeep(deepCharactersObserver);
      entityPool.unobserve(entityPoolObserver);
      connectionRequests.unobserve(connectionRequestsObserver);
    };
  }, [addNotification, currentUser.userId]);

  return {
    notifications,
    dismissNotification,
    clearAll
  };
}

import { useCallback, useMemo } from 'react';
import { getYDoc } from '../ydoc';
import { 
  updateSessionSettings, 
  endSession, 
  getAllCharacters 
} from './state';
import { useSession } from './hooks';
import { useConnectionRequests } from './useConnectionRequests';
import type { SessionSettings } from './types';

export const ALL_CAREERS = [
  'Navy', 'Army', 'Marines', 'Scout', 
  'Merchant', 'Agent', 'Noble', 'Rogue', 
  'Scholar', 'Entertainer', 'Drifter', 'Citizen'
];

export function useGMControls(currentUserId: string) {
  const session = useSession();
  
  const isGM = useMemo(() => {
    return session?.createdBy === currentUserId;
  }, [session, currentUserId]);

  const { 
    requests, 
    approveRequest, 
    rejectRequest 
  } = useConnectionRequests({ 
    isGM, 
    filterPending: true,
    currentUserId 
  });

  const updateSettings = useCallback((updates: Partial<SessionSettings>) => {
    if (!isGM) return;
    const doc = getYDoc();
    updateSessionSettings(doc, updates);
  }, [isGM]);

  const toggleCareer = useCallback((career: string) => {
    if (!isGM || !session) return;
    
    const currentAllowed = session.settings.allowedCareers || [];
    let newAllowed: string[];
    
    // According to types: "Empty = all allowed".
    // To disable one, we must explicitly list all others.
    
    const allCareers = ALL_CAREERS;
    const effectivelyAllowed = currentAllowed.length === 0 ? allCareers : currentAllowed;
    
    if (effectivelyAllowed.includes(career)) {
      newAllowed = effectivelyAllowed.filter(c => c !== career);
    } else {
      newAllowed = [...effectivelyAllowed, career];
    }
    
    // Optimization: if newAllowed contains all careers, make it empty to reflect "all allowed" state
    if (newAllowed.length === allCareers.length) {
      const sortedNew = [...newAllowed].sort();
      const sortedAll = [...allCareers].sort();
      if (sortedNew.every((val, index) => val === sortedAll[index])) {
        newAllowed = [];
      }
    }
    
    updateSettings({ allowedCareers: newAllowed });
  }, [isGM, session, updateSettings]);

  const handleEndSession = useCallback(() => {
    if (!isGM) return;
    const doc = getYDoc();
    endSession(doc);
  }, [isGM]);

  const exportAllCharacters = useCallback(() => {
    const doc = getYDoc();
    const characters = getAllCharacters(doc);
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(characters, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `highport_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }, []);

  return {
    isGM,
    session,
    settings: session?.settings,
    pendingRequests: requests,
    actions: {
      updateSettings,
      toggleCareer,
      approveRequest,
      rejectRequest,
      endSession: handleEndSession,
      exportAllCharacters
    }
  };
}

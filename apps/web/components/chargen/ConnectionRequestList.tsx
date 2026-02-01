'use client';

import React from 'react';
import { useConnectionRequests, useEntityPool, useAllCharacters } from '../../lib/chargen/hooks';
import { resolveConnectionRequest } from '../../lib/chargen/state';
import { getYDoc } from '../../lib/ydoc';
import type { ConnectionRequest } from '../../lib/chargen/types';

interface ConnectionRequestListProps {
  currentUserId: string;
  isGM?: boolean;
  filterPending?: boolean;
}

export default function ConnectionRequestList({
  currentUserId,
  isGM = false,
  filterPending = true,
}: ConnectionRequestListProps) {
  const requests = useConnectionRequests();
  const entityPool = useEntityPool();
  const characters = useAllCharacters();

  const handleApprove = (requestId: string) => {
    const doc = getYDoc();
    resolveConnectionRequest(doc, requestId, true, currentUserId);
  };

  const handleReject = (requestId: string) => {
    const doc = getYDoc();
    resolveConnectionRequest(doc, requestId, false, currentUserId);
  };

  const filteredRequests = requests.filter((req) => {
    if (filterPending) {
      return req.status === 'pending';
    }
    return true;
  });

  if (filteredRequests.length === 0) {
    return (
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-center">
        <p className="text-zinc-500 text-sm">No pending requests</p>
      </div>
    );
  }

  const getRequesterName = (charId: string) => {
    const char = characters.find((c) => c.id === charId);
    return char?.name || 'Unknown Character';
  };

  const getEntityName = (entityId: string) => {
    const entity = entityPool.find((e) => e.id === entityId);
    return entity?.name || 'Unknown Entity';
  };

  const getRelationshipLabel = (req: ConnectionRequest) => {
    if (req.relationship === 'custom' && req.customRelationship) {
      return req.customRelationship;
    }
    return req.relationship.charAt(0).toUpperCase() + req.relationship.slice(1);
  };

  const canApprove = (req: ConnectionRequest) => {
    const entity = entityPool.find((e) => e.id === req.entityId);
    if (!entity) return false;
    
    if (entity.ownedBy === currentUserId) return true;
    
    if (isGM) return true;

    return false;
  };

  return (
    <div className="space-y-3">
      <div className="border border-zinc-800 rounded-lg bg-zinc-900/50 p-4 min-h-[100px]">
        <h3 className="text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wider">
          {filterPending ? 'Pending Requests' : 'Connection Requests'}
        </h3>
        
        <div className="space-y-3">
          {filteredRequests.map((req) => {
            const requesterName = getRequesterName(req.requesterCharId);
            const entityName = getEntityName(req.entityId);
            const userCanDecide = canApprove(req);

            return (
              <div 
                key={req.id} 
                className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 shadow-sm"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="text-sm text-zinc-200">
                    <span className="font-medium text-zinc-100">{requesterName}</span>
                    <span className="text-zinc-500 mx-1">wants to connect to</span>
                    <span className="font-medium text-zinc-100">{entityName}</span>
                  </div>
                  
                  {!filterPending && (
                    <div className={`text-xs px-2 py-0.5 rounded-full border ${
                      req.status === 'approved' 
                        ? 'bg-green-900/30 text-green-400 border-green-800' 
                        : req.status === 'rejected'
                        ? 'bg-red-900/30 text-red-400 border-red-800'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}>
                      {req.status.toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="text-xs text-zinc-400 mb-1">
                  <span className="text-zinc-500">Relationship:</span>{' '}
                  <span className="text-zinc-300">{getRelationshipLabel(req)}</span>
                </div>

                {req.note && (
                  <div className="text-xs text-zinc-500 italic mb-3 bg-zinc-900/50 p-2 rounded border border-zinc-800/50">
                    "{req.note}"
                  </div>
                )}

                {req.status === 'pending' && userCanDecide && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleApprove(req.id)}
                      className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded transition-colors shadow-sm shadow-green-900/20"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      className="px-3 py-1 bg-red-950/30 hover:bg-red-900/40 text-red-400 border border-red-900/50 hover:border-red-800 text-xs font-medium rounded transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                )}
                
                {req.status === 'pending' && !userCanDecide && (
                  <div className="text-xs text-zinc-600 mt-2 italic">
                    Waiting for approval...
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

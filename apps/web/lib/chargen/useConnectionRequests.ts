'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { getYDoc } from '../ydoc';
import {
  getConnectionRequests,
  getConnectionRequestsArray,
  requestConnection,
  resolveConnectionRequest,
  getEntityPool,
} from './state';
import type { ConnectionRequest, ConnectionRelationship, SharedSpawnedEntity } from './types';

export interface UseConnectionRequestsOptions {
  filterPending?: boolean;
  filterApprovable?: boolean;
  currentUserId?: string;
  isGM?: boolean;
}

export interface ConnectionRequestWithMeta extends ConnectionRequest {
  entity?: SharedSpawnedEntity;
  canApprove: boolean;
}

export function useConnectionRequests(options: UseConnectionRequestsOptions = {}) {
  const { filterPending = false, filterApprovable = false, currentUserId, isGM = false } = options;

  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [entityPool, setEntityPool] = useState<SharedSpawnedEntity[]>([]);

  useEffect(() => {
    const doc = getYDoc();
    const requestsArray = getConnectionRequestsArray(doc);

    const updateRequests = () => {
      setRequests(getConnectionRequests(doc));
    };

    updateRequests();
    requestsArray.observeDeep(updateRequests);

    return () => {
      requestsArray.unobserveDeep(updateRequests);
    };
  }, []);

  useEffect(() => {
    const doc = getYDoc();
    const entityPoolMap = doc.getMap('entityPool');

    const updateEntityPool = () => {
      setEntityPool(getEntityPool(doc));
    };

    updateEntityPool();
    entityPoolMap.observeDeep(updateEntityPool);

    return () => {
      entityPoolMap.unobserveDeep(updateEntityPool);
    };
  }, []);

  const enrichedRequests = useMemo((): ConnectionRequestWithMeta[] => {
    return requests.map((req) => {
      const entity = entityPool.find((e) => e.id === req.entityId);

      let canApprove = false;
      if (currentUserId && req.status === 'pending') {
        if (isGM) {
          canApprove = true;
        } else if (entity && entity.ownedBy === currentUserId) {
          canApprove = true;
        }
      }

      return {
        ...req,
        entity,
        canApprove,
      };
    });
  }, [requests, entityPool, currentUserId, isGM]);

  const filteredRequests = useMemo(() => {
    let result = enrichedRequests;

    if (filterPending) {
      result = result.filter((req) => req.status === 'pending');
    }

    if (filterApprovable && currentUserId) {
      result = result.filter((req) => req.canApprove);
    }

    return result;
  }, [enrichedRequests, filterPending, filterApprovable, currentUserId]);

  const submitRequest = useCallback(
    (
      charId: string,
      entityId: string,
      relationship: ConnectionRelationship,
      note?: string,
      userId?: string,
    ): string => {
      const doc = getYDoc();
      return requestConnection(
        doc,
        charId,
        entityId,
        relationship,
        note,
        userId || currentUserId || '',
      );
    },
    [currentUserId],
  );

  const approveRequest = useCallback(
    (requestId: string): void => {
      if (!currentUserId) return;
      const doc = getYDoc();
      resolveConnectionRequest(doc, requestId, true, currentUserId);
    },
    [currentUserId],
  );

  const rejectRequest = useCallback(
    (requestId: string): void => {
      if (!currentUserId) return;
      const doc = getYDoc();
      resolveConnectionRequest(doc, requestId, false, currentUserId);
    },
    [currentUserId],
  );

  const stats = useMemo(
    () => ({
      total: requests.length,
      pending: requests.filter((r) => r.status === 'pending').length,
      approved: requests.filter((r) => r.status === 'approved').length,
      rejected: requests.filter((r) => r.status === 'rejected').length,
      approvableByMe: enrichedRequests.filter((r) => r.canApprove).length,
    }),
    [requests, enrichedRequests],
  );

  return {
    requests: filteredRequests,
    stats,
    submitRequest,
    approveRequest,
    rejectRequest,
  };
}

export function useEntityConnectionRequests(entityId: string) {
  const { requests } = useConnectionRequests();

  return useMemo(() => {
    return requests.filter((req) => req.entityId === entityId);
  }, [requests, entityId]);
}

export function useCharacterConnectionRequests(charId: string) {
  const { requests } = useConnectionRequests();

  return useMemo(() => {
    return requests.filter((req) => req.requesterCharId === charId);
  }, [requests, charId]);
}

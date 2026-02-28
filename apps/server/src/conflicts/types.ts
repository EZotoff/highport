export type ConflictSource = 'foundry' | 'highport';
export type ConflictResolution = 'keep_foundry' | 'keep_highport' | 'manual';
export type Resolution = 'keep_foundry' | 'keep_highport' | 'queue' | 'lww' | 'manual';
export type ConflictStatus = 'pending' | 'resolved' | 'dismissed';

export interface SyncFieldState {
  value: unknown;
  lastFoundrySync: Date;
  lastHighportSync: Date;
}

export interface SyncState {
  nodeId: string;
  foundryUuid: string;
  fields: Record<string, SyncFieldState>;
}

export interface IncomingChange {
  source: ConflictSource;
  fieldPath: string;
  newValue: unknown;
  timestamp: Date;
  userId?: string;
  isGmEdit?: boolean;
}

export interface ConflictContext {
  isGmEdit: boolean;
  fieldPath: string;
  source: ConflictSource;
  incomingValue: unknown;
  serverValue: unknown;
  incomingTimestamp: Date;
  serverTimestamp: Date;
  incomingUserId?: string;
  serverUserId?: string;
}

export interface ConflictItem {
  id: string;
  nodeId: string;
  fieldPath: string;
  foundryValue: unknown;
  highportValue: unknown;
  foundryTimestamp: Date;
  highportTimestamp: Date;
  status: ConflictStatus;
  resolution?: ConflictResolution;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
}

export type ConflictQueueItem = ConflictItem;

export interface ResolveConflictPayload {
  resolution: ConflictResolution;
  manualValue?: unknown;
}

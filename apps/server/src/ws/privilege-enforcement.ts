import { IncomingMessage, MessageType } from '@hocuspocus/server';
import type { beforeHandleMessagePayload } from '@hocuspocus/server';
import { record } from '../services/chargen-command.js';
import { applyAuthorizedUpdate, PrivilegedWriteError } from '../services/privilege-enforcement.js';
import { logger } from '../lib/logger.js';

export async function beforeHandleMessage(payload: beforeHandleMessagePayload): Promise<void> {
  const { document, connection, documentName, update } = payload;
  const message = new IncomingMessage(update);
  if (message.readVarString() !== documentName) return;
  const type = message.readVarUint();
  if (type !== MessageType.Sync && type !== MessageType.SyncReply) return;
  const syncType = message.readVarUint();
  // Yjs sync subtypes: 0 requests state; 1 (SyncStep2) and 2 (Update) carry writes.
  if ((syncType !== 1 && syncType !== 2) || connection.readOnly) return;
  const context: unknown = payload.context;
  try {
    if (!record(context) || typeof context['userId'] !== 'string')
      throw new PrivilegedWriteError('principal');
    applyAuthorizedUpdate(document, message.readVarUint8Array(), {
      userId: context['userId'],
      origin: connection,
    });
  } catch (error) {
    if (!(error instanceof PrivilegedWriteError)) throw error;
    logger.warn('chargen.privilege_rejected', {
      documentName,
      socketId: payload.socketId,
      path: error.path,
    });
    connection.sendStateless(JSON.stringify({ type: 'privilege_rejected', reason: error.reason }));
    throw error;
  }
}

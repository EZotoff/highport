import path from 'node:path';
import { promises as fs } from 'node:fs';

export interface PortraitStorageResult {
  storageKey: string;
  sizeBytes: number;
}

export interface PortraitStorage {
  savePortrait(data: Buffer, mimeType: string, portraitId: string): Promise<PortraitStorageResult>;
  loadPortrait(storageKey: string): Promise<Buffer>;
}

export interface SignedUrlPortraitStorage extends PortraitStorage {
  getSignedUrl(storageKey: string, expiresInSeconds?: number): Promise<string>;
}

const DEFAULT_STORAGE_PATH = process.env.PORTRAIT_STORAGE_PATH || 'uploads/portraits';

export class LocalPortraitStorage implements PortraitStorage {
  constructor(private basePath: string = DEFAULT_STORAGE_PATH) {}

  async savePortrait(data: Buffer, mimeType: string, portraitId: string): Promise<PortraitStorageResult> {
    const extension = extensionFromMime(mimeType);
    const storageKey = `${portraitId}.${extension}`;
    const fullPath = this.resolvePath(storageKey);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, data);
    return { storageKey, sizeBytes: data.length };
  }

  async loadPortrait(storageKey: string): Promise<Buffer> {
    const fullPath = this.resolvePath(storageKey);
    return await fs.readFile(fullPath);
  }

  private resolvePath(storageKey: string): string {
    return path.resolve(process.cwd(), this.basePath, storageKey);
  }
}

function extensionFromMime(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    case 'image/png':
    default:
      return 'png';
  }
}

export async function createPortraitStorage(): Promise<PortraitStorage> {
  if (process.env.PORTRAIT_STORAGE_TYPE === 's3') {
    const { S3PortraitStorage } = await import('./s3-storage.js');
    return new S3PortraitStorage();
  }

  return new LocalPortraitStorage();
}

export { extensionFromMime };

import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl as getS3SignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  extensionFromMime,
  type PortraitStorageResult,
  type SignedUrlPortraitStorage,
} from './portrait-storage.js';

const DEFAULT_SIGNED_URL_EXPIRY_SECONDS = 900;
const DEFAULT_S3_REGION = 'us-east-1';

export class S3CompatibleStorageAdapter implements SignedUrlPortraitStorage {
  private client: S3Client;
  private bucket: string;

  constructor(options: {
    bucket?: string;
    region?: string;
    endpoint?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  } = {}) {
    this.bucket = options.bucket ?? readRequiredEnv('PORTRAIT_S3_BUCKET');
    const region = options.region ?? process.env.PORTRAIT_S3_REGION ?? DEFAULT_S3_REGION;
    const endpoint = options.endpoint ?? process.env.PORTRAIT_S3_ENDPOINT;
    const accessKeyId = options.accessKeyId ?? process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = options.secretAccessKey ?? process.env.AWS_SECRET_ACCESS_KEY;

    this.client = new S3Client({
      region,
      endpoint,
      credentials: accessKeyId && secretAccessKey
        ? {
            accessKeyId,
            secretAccessKey,
          }
        : undefined,
    });
  }

  async savePortrait(data: Buffer, mimeType: string, portraitId: string): Promise<PortraitStorageResult> {
    const extension = extensionFromMime(mimeType);
    const storageKey = `${portraitId}.${extension}`;

    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      Body: data,
      ContentType: mimeType,
    }));

    return { storageKey, sizeBytes: data.length };
  }

  async loadPortrait(storageKey: string): Promise<Buffer> {
    const response = await this.client.send(new GetObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
    }));

    if (!response.Body) {
      throw new Error(`Portrait not found in object storage: ${storageKey}`);
    }

    const bytes = await response.Body.transformToByteArray();
    return Buffer.from(bytes);
  }

  async getSignedUrl(storageKey: string, expiresInSeconds = DEFAULT_SIGNED_URL_EXPIRY_SECONDS): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
    });

    return await getS3SignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }
}

export { S3CompatibleStorageAdapter as S3PortraitStorage };

function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

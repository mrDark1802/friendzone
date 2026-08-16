import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';
import { logger } from '../../config/logger.js';

dotenv.config();

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '0bfb1e2b55a21851024948866d0d0563';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || 'b37d8a69399b4f8718fbf4360e10a7b7';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '71c65248dbb4541420760694b021bcabe8f8afefefaceda177a6b1a72a17ab62';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'friendzone';
const R2_ENDPOINT = process.env.R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

export class R2Service {
  private client: S3Client;
  private bucketName: string;

  constructor() {
    this.bucketName = R2_BUCKET_NAME;
    this.client = new S3Client({
      region: 'auto',
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }

  /**
   * Generates a presigned PUT URL for direct client-to-R2 upload.
   */
  async generateUploadUrl(key: string, contentType: string, expiresIn = 900): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
      });
      return await getSignedUrl(this.client, command, { expiresIn });
    } catch (error) {
      logger.error({ err: error, key }, 'Failed to generate R2 upload URL');
      throw error;
    }
  }

  /**
   * Generates a presigned GET URL for secure short-lived media download.
   */
  async generateDownloadUrl(key: string, expiresIn = 900): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      return await getSignedUrl(this.client, command, { expiresIn });
    } catch (error) {
      logger.error({ err: error, key }, 'Failed to generate R2 download URL');
      throw error;
    }
  }

  /**
   * Checks existence and retrieves metadata of an R2 object without fetching body payload.
   */
  async headObject(key: string): Promise<{ contentLength: number; contentType?: string } | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      const res = await this.client.send(command);
      return {
        contentLength: res.ContentLength || 0,
        contentType: res.ContentType,
      };
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return null;
      }
      logger.error({ err: error, key }, 'R2 HeadObject check failed');
      return null;
    }
  }

  /**
   * Uploads a Buffer directly to R2 (used for thumbnails & processed webp images).
   */
  async putObjectBuffer(key: string, buffer: Buffer, contentType: string): Promise<void> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      });
      await this.client.send(command);
    } catch (error) {
      logger.error({ err: error, key }, 'Failed to put object buffer to R2');
      throw error;
    }
  }

  /**
   * Retrieves an object as a Buffer from R2 for thumbnail / processing needs.
   */
  async getObjectBuffer(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      const res = await this.client.send(command);
      const stream = res.Body as any;
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    } catch (error) {
      logger.error({ err: error, key }, 'Failed to fetch object buffer from R2');
      throw error;
    }
  }

  /**
   * Deletes an object from R2 bucket.
   */
  async deleteObject(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      await this.client.send(command);
    } catch (error) {
      logger.error({ err: error, key }, 'Failed to delete object from R2');
    }
  }
}

export const r2Service = new R2Service();

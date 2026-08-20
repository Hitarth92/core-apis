import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { InjectSentry, SentryService } from '@ntegral/nestjs-sentry';
import { PinoLogger } from 'nestjs-pino';
import { Readable } from 'stream';
import { EAttachmentMimeType } from '../types';
import { isNilOrEmpty } from '..';
import { FileHelper } from './file-helper';
import { IFileStorage } from './i-file-storage';
import { IFileUrlResolver } from './i-file-url.resolver';
import { R2Exception } from './exceptions/r2.exception';
import { FileNotFoundException, InvalidFileTypeException, SameFileNamesConflictException } from './exceptions';
import { IR2StorageOptions, IS3StorageOptions } from './options';

const SIGNED_URL_EXPIRY_SECONDS = 604800;

export abstract class R2FileStorage implements IFileStorage, IFileUrlResolver {
  protected readonly client: S3Client;
  protected readonly helper: FileHelper;

  public abstract get isPublic(): boolean;

  constructor(
    protected readonly storageOptions: IR2StorageOptions,
    protected readonly logger: PinoLogger,
    @InjectSentry() protected readonly sentry: SentryService,
  ) {
    const endpoint = storageOptions.endpoint.startsWith('http')
      ? storageOptions.endpoint
      : `https://${storageOptions.endpoint}`;
    this.client = new S3Client({
      region: storageOptions.region,
      endpoint,
      credentials: {
        accessKeyId: storageOptions.accessKeyId,
        secretAccessKey: storageOptions.secretAccessKey,
      },
    });
    this.helper = new FileHelper();
  }

  public async existsAsync(path: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.storageOptions.bucket, Key: path }));
      return true;
    } catch (err: unknown) {
      if (
        err instanceof NoSuchKey ||
        (err instanceof Error && err.name === 'NotFound') ||
        (err instanceof S3ServiceException && err.$metadata.httpStatusCode === 404)
      ) {
        return false;
      }
      const wrapped = this.wrapError(err);
      this.logger.error({ err: wrapped, path }, 'R2 HeadObject failed');
      this.sentry.error(`R2 HeadObject error for key: ${path}`);
      throw new R2Exception(wrapped);
    }
  }

  public async readAsync(path: string): Promise<Buffer> {
    if (!(await this.existsAsync(path))) {
      return null;
    }
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.storageOptions.bucket, Key: path }));
      return this.streamToBuffer(res.Body as Readable);
    } catch (err: unknown) {
      const wrapped = this.wrapError(err);
      this.logger.error({ err: wrapped, path }, 'R2 GetObject failed');
      this.sentry.error(`R2 GetObject error for key: ${path}`);
      throw new R2Exception(wrapped);
    }
  }

  public async writeAsync(path: string, data: Buffer, contentType?: string): Promise<string> {
    const fileType = await this.helper.getExtFromBufferAsync(data);
    if (isNilOrEmpty(fileType?.mime)) {
      throw new InvalidFileTypeException('Unable to determine file type from buffer');
    }
    const fileName = this.helper.getFileName(path);
    fileName.ext = fileType.ext;
    const resolvedPath = this.helper.joinPath(fileName);
    try {
      await this.client.send(new PutObjectCommand({
        Bucket: this.storageOptions.bucket,
        Key: resolvedPath,
        Body: data,
        ContentType: isNilOrEmpty(contentType) ? fileType.mime : contentType,
        ContentLength: data.byteLength,
      }));
      return resolvedPath;
    } catch (err: unknown) {
      const wrapped = this.wrapError(err);
      this.logger.error({ err: wrapped, path: resolvedPath }, 'R2 PutObject failed');
      this.sentry.error(`R2 PutObject error for key: ${resolvedPath}`);
      throw new R2Exception(wrapped);
    }
  }

  public async replaceAsync(path: string, data: Buffer): Promise<string> {
    const fileType = await this.helper.getExtFromBufferAsync(data);
    if (isNilOrEmpty(fileType?.mime)) {
      throw new InvalidFileTypeException('Unable to determine file type from buffer');
    }
    const fileName = this.helper.getFileName(path);
    const extChanged = fileType.ext.toLowerCase() !== fileName.ext.toLowerCase();
    const newPath = await this.writeAsync(path, data);
    if (extChanged) {
      await this.removeAsync(path);
    }
    return newPath;
  }

  public async copyAsync(srcPath: string, destPath: string): Promise<string> {
    if (this.helper.arePathesEqual(srcPath, destPath, { skipExt: true })) {
      throw new SameFileNamesConflictException('Cannot copy file to the same location');
    }
    if (!(await this.existsAsync(srcPath))) {
      throw new FileNotFoundException(`Source file not found: ${srcPath}`);
    }
    try {
      const src = this.helper.getFileName(srcPath);
      const dest = this.helper.getFileName(destPath);
      const resolvedDest = this.helper.joinPath({ location: dest.location, ext: src.ext, fileName: dest.fileName });
      await this.client.send(new CopyObjectCommand({
        Bucket: this.storageOptions.bucket,
        CopySource: `${this.storageOptions.bucket}/${srcPath}`,
        Key: resolvedDest,
      }));
      return resolvedDest;
    } catch (err: unknown) {
      const wrapped = this.wrapError(err);
      this.logger.error({ err: wrapped, srcPath, destPath }, 'R2 CopyObject failed');
      this.sentry.error(`R2 CopyObject error: ${srcPath} -> ${destPath}`);
      throw new R2Exception(wrapped);
    }
  }

  public async removeAsync(path: string, _bucketOptions?: IS3StorageOptions): Promise<boolean> {
    if (!(await this.existsAsync(path))) {
      return false;
    }
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.storageOptions.bucket, Key: path }));
      return true;
    } catch (err: unknown) {
      const wrapped = this.wrapError(err);
      this.logger.error({ err: wrapped, path }, 'R2 DeleteObject failed');
      this.sentry.error(`R2 DeleteObject error for key: ${path}`);
      throw new R2Exception(wrapped);
    }
  }

  public async getUrlAsync(path: string): Promise<string> {
    return this.isPublic ? this.buildPublicUrl(path) : this.getSignedUrlAsync(path);
  }

  public async generateUploadUrlAsync(
    path: string,
    mimeType: EAttachmentMimeType,
    expirationTime?: number,
    _metadata?: Record<string, string>,
  ): Promise<string> {
    const cmd = new PutObjectCommand({ Bucket: this.storageOptions.bucket, Key: path, ContentType: mimeType });
    return getSignedUrl(this.client, cmd, { expiresIn: expirationTime ?? SIGNED_URL_EXPIRY_SECONDS });
  }

  private async getSignedUrlAsync(path: string): Promise<string> {
    if (!(await this.existsAsync(path))) {
      return null;
    }
    try {
      return await getSignedUrl(
        this.client,
        new GetObjectCommand({ Bucket: this.storageOptions.bucket, Key: path }),
        { expiresIn: SIGNED_URL_EXPIRY_SECONDS },
      );
    } catch (err: unknown) {
      const wrapped = this.wrapError(err);
      this.logger.error({ err: wrapped, path }, 'R2 presign failed');
      throw new R2Exception(wrapped);
    }
  }

  private buildPublicUrl(path: string): string {
    const base = (this.storageOptions.publicUrlBase ?? '').replace(/\/$/, '');
    return `${base}/${path}`;
  }

  private streamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.once('end', () => resolve(Buffer.concat(chunks)));
      stream.once('error', reject);
    });
  }

  private wrapError(err: unknown): Error {
    if (err instanceof Error) {
      return err;
    }
    return new Error(typeof err === 'string' ? err : JSON.stringify(err));
  }
}

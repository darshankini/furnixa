import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, rm, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

/** The parts of a multer upload we use (kept local so we don't need @types/multer) */
export interface UploadedFileData {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface StoredFile {
  /** Name on disk: a random id plus the original extension */
  fileName: string;
  /** Path relative to the upload root, with forward slashes, e.g. leads/12/sales/<uuid>.pdf */
  relativePath: string;
  extension: string | null;
}

/**
 * Saves lead files on the server's disk under UPLOAD_DIR (default: backend/uploads).
 *
 * Note: Vercel functions have no persistent disk, so in production this needs to be swapped
 * for object storage (S3, Vercel Blob, …). Only this class would change.
 */
@Injectable()
export class FileStorageService {
  private readonly root: string;

  constructor(config: ConfigService) {
    this.root = path.resolve(config.get<string>('UPLOAD_DIR') || 'uploads');
  }

  /** `folder` is relative to the upload root, e.g. "leads/12/sales" */
  async save(folder: string, file: UploadedFileData): Promise<StoredFile> {
    const extension = safeExtension(file.originalname);
    const fileName = `${randomUUID()}${extension ?? ''}`;
    const relativePath = path.posix.join(folder, fileName);

    const absolute = this.resolve(relativePath);
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, file.buffer);

    return { fileName, relativePath, extension: extension?.slice(1) ?? null };
  }

  /** Returns null if the file is missing on disk */
  async open(relativePath: string) {
    const absolute = this.resolve(relativePath);
    try {
      const info = await stat(absolute);
      if (!info.isFile()) return null;
    } catch {
      return null;
    }
    return createReadStream(absolute);
  }

  /** Deleting a file that is already gone is not an error */
  async remove(relativePath: string): Promise<void> {
    await unlink(this.resolve(relativePath)).catch(() => undefined);
  }

  async removeFolder(folder: string): Promise<void> {
    await rm(this.resolve(folder), { recursive: true, force: true });
  }

  /** Absolute path for a stored path, refusing anything that would escape the upload root */
  private resolve(relativePath: string): string {
    const absolute = path.resolve(this.root, relativePath);
    if (absolute !== this.root && !absolute.startsWith(this.root + path.sep)) {
      throw new Error(`Refusing to touch a path outside the upload folder: ${relativePath}`);
    }
    return absolute;
  }
}

/** ".pdf", ".dwg" … lowercased; null for odd or missing extensions */
function safeExtension(originalName: string): string | null {
  const ext = path.extname(originalName).toLowerCase();
  return /^\.[a-z0-9]{1,10}$/.test(ext) ? ext : null;
}

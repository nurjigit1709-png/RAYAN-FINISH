import fs from "fs";
import path from "path";
import { Readable } from "stream";

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.resolve(process.cwd(), "uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export class LocalStorageFile {
  constructor(public filePath: string) {}

  async save(buffer: Buffer, _opts?: { contentType?: string; resumable?: boolean }): Promise<void> {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.filePath, buffer);
  }

  async exists(): Promise<[boolean]> {
    return [fs.existsSync(this.filePath)];
  }

  async delete(): Promise<void> {
    if (fs.existsSync(this.filePath)) fs.unlinkSync(this.filePath);
  }

  async getMetadata(): Promise<[{ contentType?: string; size?: number }]> {
    try {
      const stat = fs.statSync(this.filePath);
      return [{ size: stat.size }];
    } catch {
      return [{}];
    }
  }

  createReadStream(): Readable {
    return fs.createReadStream(this.filePath);
  }
}

export class LocalBucket {
  constructor(public _bucketId: string) {}

  file(objectName: string): LocalStorageFile {
    const safeName = objectName.replace(/\.\./g, "_");
    return new LocalStorageFile(path.join(UPLOADS_DIR, safeName));
  }
}

export const objectStorageClient = {
  bucket(_bucketId: string): LocalBucket {
    return new LocalBucket(_bucketId);
  },
};

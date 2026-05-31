import { Router, type IRouter } from "express";
import { eq, and, ilike, asc, desc } from "drizzle-orm";
import { db, filesTable, usersTable, logsTable } from "@workspace/db";
import { requireAuth } from "./auth";
import multer from "multer";
import path from "path";
import { objectStorageClient } from "../lib/objectStorage";

const router: IRouter = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });

function getBucket() {
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || "local";
  return objectStorageClient.bucket(bucketId);
}

async function uploadToStorage(buffer: Buffer, originalName: string, mimeType: string): Promise<string> {
  const ext = path.extname(originalName);
  const base = path.basename(originalName, ext).replace(/[^a-zA-Z0-9-_]/g, "_");
  const objectName = `uploads/files/${Date.now()}_${base}${ext}`;
  const bucket = getBucket();
  const file = bucket.file(objectName);
  await file.save(buffer, { contentType: mimeType, resumable: false });
  return objectName;
}

async function enrichFiles(rows: any[]) {
  return Promise.all(
    rows.map(async (f) => {
      const [uploader] = await db
        .select({ name: usersTable.name })
        .from(usersTable)
        .where(eq(usersTable.id, f.uploadedBy));
      return { ...f, uploaderName: uploader?.name || null };
    })
  );
}

router.get("/files", requireAuth, async (req, res): Promise<void> => {
  const { folderId, search, sortOrder } = req.query as any;
  const conditions: any[] = [];
  if (folderId !== undefined && folderId !== "" && folderId !== "null") {
    conditions.push(eq(filesTable.folderId, parseInt(folderId, 10)));
  }
  if (search && typeof search === "string" && search.trim()) {
    conditions.push(ilike(filesTable.name, `%${search.trim()}%`));
  }
  const rows = await db
    .select()
    .from(filesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sortOrder === "asc" ? asc(filesTable.createdAt) : desc(filesTable.createdAt));
  const enriched = await enrichFiles(rows);
  res.json(enriched);
});

router.get("/files/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [file] = await db.select().from(filesTable).where(eq(filesTable.id, id));
  if (!file) { res.status(404).json({ error: "Not found" }); return; }
  const [uploader] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, file.uploadedBy));
  res.json({ ...file, uploaderName: uploader?.name || null });
});

router.get("/files/:id/download", requireAuth, async (req: any, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [file] = await db.select().from(filesTable).where(eq(filesTable.id, id));
  if (!file) { res.status(404).json({ error: "Not found" }); return; }

  try {
    const bucket = getBucket();
    const storageFile = bucket.file(file.storagePath);
    const [exists] = await storageFile.exists();
    if (!exists) { res.status(404).json({ error: "File not found in storage" }); return; }

    await db.insert(logsTable).values({ action: "download", userId: req.user.id, fileId: id });

    const safeName = encodeURIComponent(file.originalName || file.name);
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${safeName}`);
    res.setHeader("Content-Type", file.mimeType || "application/octet-stream");

    const [meta] = await storageFile.getMetadata();
    if (meta?.size) {
      res.setHeader("Content-Length", String(meta.size));
    }

    storageFile.createReadStream().pipe(res);
  } catch (err: any) {
    console.error("Download error:", err);
    res.status(500).json({ error: "Download failed: " + err.message });
  }
});

router.post("/files", requireAuth, upload.single("file"), async (req: any, res): Promise<void> => {
  if (req.user.role === "employee") { res.status(403).json({ error: "Forbidden" }); return; }
  if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }
  const folderId = req.body.folderId ? parseInt(req.body.folderId, 10) : null;

  // Fix multer latin1 filename encoding for non-ASCII (Cyrillic, etc.) characters
  const originalname = Buffer.from(req.file.originalname, "latin1").toString("utf8");

  try {
    const storagePath = await uploadToStorage(req.file.buffer, originalname, req.file.mimetype);
    const [saved] = await db.insert(filesTable).values({
      name: req.body.name || originalname,
      originalName: originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      storagePath,
      folderId,
      uploadedBy: req.user.id,
    }).returning();
    await db.insert(logsTable).values({ action: "upload", userId: req.user.id, fileId: saved.id });
    res.status(201).json({ ...saved, uploaderName: req.user.name });
  } catch (err: any) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Upload failed: " + err.message });
  }
});

router.delete("/files/:id", requireAuth, async (req: any, res): Promise<void> => {
  if (req.user.role === "employee") { res.status(403).json({ error: "Forbidden" }); return; }
  const id = parseInt(req.params.id as string, 10);
  const [file] = await db.select().from(filesTable).where(eq(filesTable.id, id));
  if (!file) { res.status(404).json({ error: "Not found" }); return; }

  try {
    const bucket = getBucket();
    const storageFile = bucket.file(file.storagePath);
    const [exists] = await storageFile.exists();
    if (exists) await storageFile.delete();
  } catch (err) {
    console.error("Storage delete error:", err);
  }

  await db.insert(logsTable).values({ action: "delete", userId: req.user.id, fileId: id });
  await db.delete(filesTable).where(eq(filesTable.id, id));
  res.sendStatus(204);
});

export default router;

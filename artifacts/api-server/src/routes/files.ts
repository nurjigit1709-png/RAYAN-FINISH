import { Router, type IRouter } from "express";
import { eq, and, ilike, asc, desc } from "drizzle-orm";
import { db, filesTable, usersTable, logsTable } from "@workspace/db";
import { requireAuth } from "./auth";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { createReadStream } from "fs";
import crypto from "crypto";

const router: IRouter = Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR || "/data/uploads";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
});

async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

function safeFileName(originalName: string) {
  const ext = path.extname(originalName);
  const id = crypto.randomBytes(16).toString("hex");
  return `${Date.now()}_${id}${ext}`;
}

async function saveToDisk(buffer: Buffer, originalName: string): Promise<string> {
  await ensureUploadDir();
  const fileName = safeFileName(originalName);
  const fullPath = path.join(UPLOAD_DIR, fileName);
  await fs.writeFile(fullPath, buffer);
  return fileName;
}

async function enrichFiles(rows: any[]) {
  return Promise.all(
    rows.map(async (f) => {
      const [uploader] = await db
        .select({ name: usersTable.name })
        .from(usersTable)
        .where(eq(usersTable.id, f.uploadedBy));

      return { ...f, uploaderName: uploader?.name || null };
    }),
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

  res.json(await enrichFiles(rows));
});

router.get("/files/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);

  const [file] = await db.select().from(filesTable).where(eq(filesTable.id, id));

  if (!file) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [uploader] = await db
    .select({ name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.id, file.uploadedBy));

  res.json({ ...file, uploaderName: uploader?.name || null });
});

router.get("/files/:id/download", requireAuth, async (req: any, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);

  const [file] = await db.select().from(filesTable).where(eq(filesTable.id, id));

  if (!file) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const fullPath = path.join(UPLOAD_DIR, file.storagePath);

  try {
    await fs.access(fullPath);

    try {
      await db.insert(logsTable).values({
        action: "download",
        userId: req.user.id,
        fileId: id,
      });
    } catch {}

    const downloadName = encodeURIComponent(file.originalName || file.name);

    res.setHeader("Content-Type", file.mimeType || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${downloadName}`);

    createReadStream(fullPath).pipe(res);
  } catch {
    res.status(404).json({ error: "File not found on server" });
  }
});

router.post("/files", requireAuth, upload.single("file"), async (req: any, res): Promise<void> => {
  if (req.user.role === "employee") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  const folderId = req.body.folderId ? parseInt(req.body.folderId, 10) : null;
  const originalName = Buffer.from(req.file.originalname, "latin1").toString("utf8");

  try {
    const storagePath = await saveToDisk(req.file.buffer, originalName);

    const [saved] = await db
      .insert(filesTable)
      .values({
        name: req.body.name || originalName,
        originalName,
        mimeType: req.file.mimetype,
        size: req.file.size,
        storagePath,
        folderId,
        uploadedBy: req.user.id,
      })
      .returning();

    try {
      await db.insert(logsTable).values({
        action: "upload",
        userId: req.user.id,
        fileId: saved.id,
      });
    } catch {}

    res.status(201).json({ ...saved, uploaderName: req.user.name });
  } catch (err: any) {
    res.status(500).json({ error: "Upload failed: " + err.message });
  }
});

router.delete("/files/:id", requireAuth, async (req: any, res): Promise<void> => {
  if (req.user.role === "employee") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const id = parseInt(req.params.id as string, 10);

  const [file] = await db.select().from(filesTable).where(eq(filesTable.id, id));

  if (!file) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  try {
    await fs.unlink(path.join(UPLOAD_DIR, file.storagePath));
  } catch {}

  try {
    await db.insert(logsTable).values({
      action: "delete",
      userId: req.user.id,
      fileId: id,
    });
  } catch {}

  await db.delete(filesTable).where(eq(filesTable.id, id));

  res.sendStatus(204);
});

export default router;

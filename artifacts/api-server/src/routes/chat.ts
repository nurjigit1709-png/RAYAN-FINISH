import { Router, type IRouter } from "express";
import { eq, or, and, desc, sql, ne } from "drizzle-orm";
import { db, messagesTable, usersTable, filesTable } from "@workspace/db";
import { requireAuth } from "./auth";

const router: IRouter = Router();

router.get("/chat/conversations", requireAuth, async (req: any, res): Promise<void> => {
  const userId = req.user.id;

  const allUsers = await db
    .select({ id: usersTable.id, name: usersTable.name, role: usersTable.role })
    .from(usersTable)
    .where(ne(usersTable.id, userId));

  const conversations = await Promise.all(
    allUsers.map(async (user) => {
      const [lastMsg] = await db
        .select({ content: messagesTable.content, fileId: messagesTable.fileId, createdAt: messagesTable.createdAt })
        .from(messagesTable)
        .where(
          or(
            and(eq(messagesTable.senderId, userId), eq(messagesTable.receiverId, user.id)),
            and(eq(messagesTable.senderId, user.id), eq(messagesTable.receiverId, userId))
          )
        )
        .orderBy(desc(messagesTable.createdAt))
        .limit(1);

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(messagesTable)
        .where(
          and(
            eq(messagesTable.senderId, user.id),
            eq(messagesTable.receiverId, userId),
            eq(messagesTable.isRead, false)
          )
        );

      return {
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        lastMessage: lastMsg?.content ?? null,
        lastFileId: lastMsg?.fileId ?? null,
        lastFileName: null as string | null,
        unreadCount: Number(count),
        lastMessageAt: lastMsg?.createdAt ? lastMsg.createdAt.toISOString() : null,
      };
    })
  );

  conversations.sort((a, b) => {
    if (a.lastMessageAt && b.lastMessageAt) return b.lastMessageAt.localeCompare(a.lastMessageAt);
    if (a.lastMessageAt) return -1;
    if (b.lastMessageAt) return 1;
    return a.userName.localeCompare(b.userName);
  });

  res.json(conversations);
});

router.get("/chat/messages", requireAuth, async (req: any, res): Promise<void> => {
  const userId = req.user.id;
  const otherId = parseInt(req.query.userId as string, 10);
  if (isNaN(otherId)) { res.status(400).json({ error: "userId required" }); return; }

  const messages = await db
    .select()
    .from(messagesTable)
    .where(
      or(
        and(eq(messagesTable.senderId, userId), eq(messagesTable.receiverId, otherId)),
        and(eq(messagesTable.senderId, otherId), eq(messagesTable.receiverId, userId))
      )
    )
    .orderBy(messagesTable.createdAt);

  const enriched = await Promise.all(
    messages.map(async (msg) => {
      const [sender] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, msg.senderId));
      let fileName = null as string | null, fileMimeType = null as string | null, fileSize = null as number | null;
      if (msg.fileId) {
        const [file] = await db.select({ name: filesTable.name, mimeType: filesTable.mimeType, size: filesTable.size }).from(filesTable).where(eq(filesTable.id, msg.fileId));
        if (file) { fileName = file.name; fileMimeType = file.mimeType; fileSize = file.size; }
      }
      return { ...msg, createdAt: msg.createdAt.toISOString(), senderName: sender?.name ?? "Unknown", fileName, fileMimeType, fileSize };
    })
  );

  await db
    .update(messagesTable)
    .set({ isRead: true })
    .where(and(eq(messagesTable.senderId, otherId), eq(messagesTable.receiverId, userId), eq(messagesTable.isRead, false)));

  res.json(enriched);
});

router.post("/chat/messages", requireAuth, async (req: any, res): Promise<void> => {
  const { receiverId, content, fileId } = req.body;
  if (!receiverId || (!content && !fileId)) {
    res.status(400).json({ error: "receiverId and content or fileId required" }); return;
  }

  const [msg] = await db.insert(messagesTable).values({
    senderId: req.user.id,
    receiverId: parseInt(String(receiverId), 10),
    content: content ?? null,
    fileId: fileId ? parseInt(String(fileId), 10) : null,
    isRead: false,
  }).returning();

  const [sender] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, msg.senderId));
  let fileName = null as string | null, fileMimeType = null as string | null, fileSize = null as number | null;
  if (msg.fileId) {
    const [file] = await db.select({ name: filesTable.name, mimeType: filesTable.mimeType, size: filesTable.size }).from(filesTable).where(eq(filesTable.id, msg.fileId));
    if (file) { fileName = file.name; fileMimeType = file.mimeType; fileSize = file.size; }
  }

  res.status(201).json({ ...msg, createdAt: msg.createdAt.toISOString(), senderName: sender?.name ?? "Unknown", fileName, fileMimeType, fileSize });
});

router.patch("/chat/messages/:id/read", requireAuth, async (req: any, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.update(messagesTable).set({ isRead: true }).where(eq(messagesTable.id, id));
  res.json({ ok: true });
});

export default router;

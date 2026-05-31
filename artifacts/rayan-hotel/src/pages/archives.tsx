import { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useListFolders, useCreateFolder, useListFiles, useDeleteFile, useListUsers, getListFoldersQueryKey, getListFilesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderOpen, Plus, Upload, Download, Trash2, Search, MoreVertical, MessageCircle } from "lucide-react";
import { formatBytes, formatDate, getFileIconEmoji, downloadFile } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function ArchivesPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Send to chat state
  const [sendChatFile, setSendChatFile] = useState<any>(null);
  const [chatRecipient, setChatRecipient] = useState("");
  const [chatMessage, setChatMessage] = useState("");

  const { data: folders = [], isLoading: foldersLoading } = useListFolders({});
const { data: files = [], isLoading: filesLoading } =
  useListFiles({ folderId: undefined, search });

const { data: users = [] } = useListUsers();

const createFolder = useCreateFolder();
const deleteFile = useDeleteFile();

const canUpload =
  user?.role === "super_admin" ||
  user?.role === "manager" ||
  user?.role === "programmer";

const canDelete =
  user?.role === "super_admin" ||
  user?.role === "manager" ||
  user?.role === "programmer";

const rootFolders =
  (folders as any[]).filter((f: any) => !f.parentId);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolder.mutateAsync({ data: { name: newFolderName.trim() } });
    queryClient.invalidateQueries({ queryKey: getListFoldersQueryKey() });
    setNewFolderName("");
    setShowCreateFolder(false);
    toast({ title: "Папка создана" });
  };

  const uploadFiles = async (fileList: FileList | null) => {
    if (!fileList) return;
    setUploading(true);
    const token = localStorage.getItem("rayan_token") || sessionStorage.getItem("rayan_token");
    for (const file of Array.from(fileList)) {
      const fd = new FormData();
      fd.append("file", file);
      await fetch("/api/files", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
    }
    queryClient.invalidateQueries({ queryKey: getListFilesQueryKey() });
    setUploading(false);
    toast({ title: `${fileList.length} файл(ов) загружено` });
  };

  const handleDeleteFile = async (id: number, name: string) => {
    if (!confirm(t("common.confirm"))) return;
    await deleteFile.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListFilesQueryKey() });
    toast({ title: `${name} удалён` });
  };

  const handleDownload = async (file: any) => {
    try {
      await downloadFile(file.id, file.originalName || file.name);
    } catch {
      toast({ title: "Ошибка скачивания", variant: "destructive" });
    }
  };

  const handleSendToChat = async () => {
    if (!sendChatFile || !chatRecipient) return;
    const token = localStorage.getItem("rayan_token") || sessionStorage.getItem("rayan_token");
    await fetch("/api/chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ receiverId: parseInt(chatRecipient), content: chatMessage || null, fileId: sendChatFile.id }),
    });
    toast({ title: `Файл отправлен в чат` });
    setSendChatFile(null);
    setChatRecipient("");
    setChatMessage("");
    navigate("/chat");
  };

  const otherUsers = (users as any[]).filter((u: any) => u.id !== user?.id);
  const rootFiles = (files as any[]).filter((f: any) => !f.folderId);

  const FileRow = ({ file, showDelete = true }: { file: any; showDelete?: boolean }) => (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors">
      <span className="text-xl flex-shrink-0">{getFileIconEmoji(file.mimeType)}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground">{file.uploaderName} · {formatDate(file.createdAt)} · {formatBytes(file.size)}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => handleDownload(file)}
          className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          title="Скачать"
        >
          <Download className="w-4 h-4" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <MoreVertical className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover border-border">
            <DropdownMenuItem onClick={() => { setSendChatFile(file); setChatMessage(""); setChatRecipient(""); }}
              className="gap-2 cursor-pointer">
              <MessageCircle className="w-4 h-4 text-primary" />
              Отправить в чат
            </DropdownMenuItem>
            {canDelete && showDelete && (
              <DropdownMenuItem onClick={() => handleDeleteFile(file.id, file.name)}
                className="gap-2 cursor-pointer text-destructive focus:text-destructive">
                <Trash2 className="w-4 h-4" />
                {t("files.delete")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-primary" />
            {t("nav.archives")}
          </h1>
          <div className="flex items-center gap-2">
            {canUpload && (
              <>
                <Button size="sm" variant="outline" onClick={() => setShowCreateFolder(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  {t("folders.create")}
                </Button>
                <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  {uploading ? t("common.loading") : t("files.upload")}
                </Button>
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => uploadFiles(e.target.files)} />
              </>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Drag & Drop Zone */}
        {canUpload && (
          <div
            className={cn(
              "border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer",
              isDragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 hover:bg-accent/50"
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); uploadFiles(e.dataTransfer.files); }}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className={cn("w-8 h-8 mx-auto mb-2", isDragging ? "text-primary" : "text-muted-foreground")} />
            <p className="text-sm text-muted-foreground">{t("files.dragDrop")}</p>
            {uploading && <p className="text-xs text-primary mt-1 animate-pulse">{t("common.loading")}</p>}
          </div>
        )}

        {/* Folders grid */}
        {foldersLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : rootFolders.length > 0 ? (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">Папки</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {rootFolders.map((folder: any) => (
                <Link key={folder.id} href={`/folders/${folder.id}`}>
                  <div className="flex flex-col items-center gap-2 p-4 bg-card border border-border rounded-xl hover:border-primary/40 hover:bg-accent/50 transition-all cursor-pointer group">
                    <FolderOpen className="w-8 h-8 text-amber-400 group-hover:text-primary transition-colors" />
                    <p className="text-xs font-medium text-foreground text-center truncate w-full">{folder.name}</p>
                    {folder.fileCount !== undefined && (
                      <p className="text-[10px] text-muted-foreground">{folder.fileCount} файлов</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {/* Root files */}
        {!search && rootFiles.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">Файлы</h2>
            <Card className="bg-card border-border overflow-hidden">
              <div className="divide-y divide-border">
                {rootFiles.map((file: any) => <FileRow key={file.id} file={file} />)}
              </div>
            </Card>
          </div>
        )}

        {/* Search results */}
        {search && (
          <Card className="bg-card border-border overflow-hidden">
            <CardHeader className="pb-2 border-b border-border">
              <CardTitle className="text-sm">{(files as any[]).length} результатов</CardTitle>
            </CardHeader>
            <div className="divide-y divide-border">
              {(files as any[]).map((file: any) => <FileRow key={file.id} file={file} />)}
              {(files as any[]).length === 0 && (
                <div className="p-6 text-center text-muted-foreground text-sm">{t("common.noData")}</div>
              )}
            </div>
          </Card>
        )}

        {/* Create folder dialog */}
        <Dialog open={showCreateFolder} onOpenChange={setShowCreateFolder}>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>{t("folders.create")}</DialogTitle></DialogHeader>
            <Input
              placeholder={t("folders.name")}
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
              autoFocus
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateFolder(false)}>{t("common.cancel")}</Button>
              <Button onClick={handleCreateFolder} disabled={createFolder.isPending}>{t("common.create")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Send to chat dialog */}
        <Dialog open={!!sendChatFile} onOpenChange={(o) => !o && setSendChatFile(null)}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-primary" />
                Отправить файл в чат
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-accent/50 rounded-lg">
                <span className="text-lg">{sendChatFile && getFileIconEmoji(sendChatFile.mimeType)}</span>
                <p className="text-sm font-medium truncate">{sendChatFile?.name}</p>
              </div>
              <Select value={chatRecipient} onValueChange={setChatRecipient}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Выберите получателя..." />
                </SelectTrigger>
                <SelectContent>
                  {otherUsers.map((u: any) => (
                    <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Сообщение (необязательно)"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSendChatFile(null)}>{t("common.cancel")}</Button>
              <Button onClick={handleSendToChat} disabled={!chatRecipient}>Отправить</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

import { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useGetFolder, useListFolders, useListFiles, useCreateFolder, useDeleteFile, useDeleteFolder, getListFilesQueryKey, getListFoldersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderOpen, Plus, Upload, Download, Trash2, ChevronRight, Home } from "lucide-react";
import { formatBytes, formatDate, getFileIconEmoji } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function FolderPage({ id }: { id: string }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderId = parseInt(id, 10);

  const { data: folder, isLoading: folderLoading } = useGetFolder(folderId);
  const { data: subFolders = [] } = useListFolders({ parentId: folderId });
  const { data: files = [], isLoading: filesLoading } = useListFiles({ folderId });
  const createFolder = useCreateFolder();
  const deleteFile = useDeleteFile();
  const deleteFolder = useDeleteFolder();

  const canUpload = user?.role === "super_admin" || user?.role === "manager";
  const canDelete = user?.role === "super_admin" || user?.role === "manager";

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolder.mutateAsync({ data: { name: newFolderName.trim(), parentId: folderId } });
    queryClient.invalidateQueries({ queryKey: getListFoldersQueryKey({ parentId: folderId }) });
    setNewFolderName("");
    setShowCreateFolder(false);
    toast({ title: "Folder created" });
  };

  const uploadFiles = async (fileList: FileList | null) => {
    if (!fileList) return;
    setUploading(true);
    const token = localStorage.getItem("rayan_token");
    for (const file of Array.from(fileList)) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folderId", String(folderId));
      await fetch("/api/files", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
    }
    queryClient.invalidateQueries({ queryKey: getListFilesQueryKey({ folderId }) });
    setUploading(false);
    toast({ title: `Files uploaded` });
  };

  const handleDeleteFile = async (fileId: number, name: string) => {
    if (!confirm(t("common.confirm"))) return;
    await deleteFile.mutateAsync({ id: fileId });
    queryClient.invalidateQueries({ queryKey: getListFilesQueryKey({ folderId }) });
    toast({ title: `${name} deleted` });
  };

  const handleDeleteFolder = async () => {
    if (!confirm(t("common.confirm"))) return;
    await deleteFolder.mutateAsync({ id: folderId });
    queryClient.invalidateQueries({ queryKey: getListFoldersQueryKey() });
    setLocation("/archives");
    toast({ title: "Folder deleted" });
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
          <Link href="/dashboard">
            <span className="hover:text-foreground transition-colors cursor-pointer flex items-center gap-1">
              <Home className="w-3.5 h-3.5" />{t("breadcrumb.home")}
            </span>
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/archives">
            <span className="hover:text-foreground transition-colors cursor-pointer">{t("nav.archives")}</span>
          </Link>
          {folder && (
            <>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-foreground font-medium">{folder.name}</span>
            </>
          )}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-amber-400" />
            {folderLoading ? <Skeleton className="h-7 w-40" /> : folder?.name}
          </h1>
          <div className="flex items-center gap-2">
            {canUpload && (
              <>
                <Button size="sm" variant="outline" onClick={() => setShowCreateFolder(true)} data-testid="btn-create-subfolder">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />{t("folders.create")}
                </Button>
                <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} data-testid="btn-upload">
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  {uploading ? t("common.loading") : t("files.upload")}
                </Button>
                <input ref={fileInputRef} type="file" multiple className="hidden"
                  onChange={(e) => uploadFiles(e.target.files)} data-testid="input-file-upload" />
              </>
            )}
            {canDelete && (
              <Button size="sm" variant="destructive" onClick={handleDeleteFolder} data-testid="btn-delete-folder">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Drag & Drop */}
        {canUpload && (
          <div
            className={cn(
              "border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer",
              isDragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 hover:bg-accent/50"
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); uploadFiles(e.dataTransfer.files); }}
            onClick={() => fileInputRef.current?.click()}
            data-testid="dropzone"
          >
            <Upload className={cn("w-6 h-6 mx-auto mb-1.5", isDragging ? "text-primary" : "text-muted-foreground")} />
            <p className="text-sm text-muted-foreground">{t("files.dragDrop")}</p>
          </div>
        )}

        {/* Sub-folders */}
        {subFolders.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">Sub-folders</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {subFolders.map((sf: any) => (
                <Link key={sf.id} href={`/folders/${sf.id}`}>
                  <div className="flex flex-col items-center gap-2 p-4 bg-card border border-border rounded-xl hover:border-primary/40 hover:bg-accent/50 transition-all cursor-pointer group" data-testid={`subfolder-${sf.id}`}>
                    <FolderOpen className="w-8 h-8 text-amber-400 group-hover:text-primary transition-colors" />
                    <p className="text-xs font-medium text-center truncate w-full">{sf.name}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Files table */}
        <Card className="bg-card border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{t("files.name")}</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 hidden sm:table-cell">{t("files.uploadedBy")}</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 hidden md:table-cell">{t("files.date")}</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 hidden sm:table-cell">{t("files.size")}</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3">{t("files.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filesLoading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i}><td colSpan={5} className="px-4 py-3"><Skeleton className="h-8 w-full" /></td></tr>
                  ))
                ) : files.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-sm text-muted-foreground py-10">{t("files.noFiles")}</td>
                  </tr>
                ) : files.map((file: any) => (
                  <tr key={file.id} className="hover:bg-accent/40 transition-colors" data-testid={`file-row-${file.id}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{getFileIconEmoji(file.mimeType)}</span>
                        <span className="text-sm font-medium text-foreground truncate max-w-[180px]">{file.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">{file.uploaderName}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">{formatDate(file.createdAt)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">{formatBytes(file.size)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          data-testid={`btn-download-${file.id}`}
                          onClick={async () => {
                            const token = localStorage.getItem("rayan_token") || sessionStorage.getItem("rayan_token");
                            const res = await fetch(`/api/files/${file.id}/download`, {
                              headers: { Authorization: `Bearer ${token}` },
                            });
                            if (!res.ok) { toast({ title: "Download failed", variant: "destructive" }); return; }
                            const blob = await res.blob();
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = file.originalName || file.name;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {canDelete && (
                          <button onClick={() => handleDeleteFile(file.id, file.name)}
                            className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            data-testid={`btn-delete-${file.id}`}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Create subfolder dialog */}
        <Dialog open={showCreateFolder} onOpenChange={setShowCreateFolder}>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>{t("folders.create")}</DialogTitle></DialogHeader>
            <Input placeholder={t("folders.name")} value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()} autoFocus data-testid="input-folder-name" />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateFolder(false)}>{t("common.cancel")}</Button>
              <Button onClick={handleCreateFolder} disabled={createFolder.isPending} data-testid="btn-confirm-create">{t("common.create")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

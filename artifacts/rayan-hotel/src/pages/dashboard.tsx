import { useState } from "react";
import { Link } from "wouter";
import {
  useGetDashboardStats, useGetRecentFiles, useGetRecentActivity,
  useListFiles, getListFilesQueryKey
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText, FolderOpen, Users, HardDrive, Upload,
  Search, Download, Clock, TrendingUp
} from "lucide-react";
import { formatBytes, formatDate, getFileIconEmoji, downloadFile } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: recentFiles = [], isLoading: filesLoading } = useGetRecentFiles() as any;
  const { data: activity = [], isLoading: activityLoading } = useGetRecentActivity() as any;
  const { data: searchResults = [] } = useListFiles(
    { search },
    { query: { enabled: search.length >= 2, queryKey: getListFilesQueryKey({ search }) } }
  );

  const statsCards = [
    { key: "totalFiles", label: t("dashboard.totalFiles"), value: stats?.totalFiles ?? 0, icon: FileText, color: "text-blue-400" },
    { key: "totalFolders", label: t("dashboard.totalFolders"), value: stats?.totalFolders ?? 0, icon: FolderOpen, color: "text-amber-400" },
    { key: "totalUsers", label: t("dashboard.totalUsers"), value: stats?.totalUsers ?? 0, icon: Users, color: "text-green-400" },
    { key: "storage", label: t("dashboard.storage"), value: formatBytes(stats?.totalSize ?? 0), icon: HardDrive, color: "text-purple-400" },
    { key: "uploadedToday", label: t("dashboard.uploadedToday"), value: stats?.uploadedToday ?? 0, icon: Upload, color: "text-rose-400" },
  ];

  const getActionLabel = (action: string) => t(`actions.${action}`) || action;
  const getActionColor = (action: string) => {
    if (action === "upload") return "bg-blue-500/15 text-blue-400";
    if (action === "download") return "bg-green-500/15 text-green-400";
    if (action === "delete" || action === "delete_folder" || action === "delete_user") return "bg-red-500/15 text-red-400";
    if (action === "login") return "bg-amber-500/15 text-amber-400";
    if (action === "block_user") return "bg-orange-500/15 text-orange-400";
    return "bg-muted text-muted-foreground";
  };

  const handleDownload = async (file: any) => {
    try {
      await downloadFile(file.id, file.originalName || file.name);
    } catch {
      toast({ title: "Ошибка скачивания", variant: "destructive" });
    }
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              RAYAN A.F.
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Rayan Hotel Archive System</p>
          </div>
          <TrendingUp className="w-6 h-6 text-primary hidden sm:block" />
        </div>

        {/* Quick search */}
        <div className="relative max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("dashboard.quickSearch")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border"
          />
          {search.length >= 2 && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl z-20 overflow-hidden">
              {(searchResults as any[]).slice(0, 6).map((file: any) => (
                <div key={file.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent transition-colors cursor-pointer">
                  <span>{getFileIconEmoji(file.mimeType)}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(file.size)} · {file.uploaderName}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {statsCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.key} className="bg-card border-border hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  {statsLoading ? (
                    <Skeleton className="h-12 w-full" />
                  ) : (
                    <>
                      <div className={cn("mb-2", stat.color)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent files */}
          <Card className="lg:col-span-2 bg-card border-border">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                {t("dashboard.recentFiles")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filesLoading ? (
                <div className="p-4 space-y-3">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (recentFiles as any[]).length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">{t("files.noFiles")}</div>
              ) : (
                <div className="divide-y divide-border">
                  {(recentFiles as any[]).map((file: any) => (
                    <div key={file.id} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors">
                      <span className="text-lg flex-shrink-0">{getFileIconEmoji(file.mimeType)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{file.uploaderName} · {formatDate(file.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>
                        <button
                          onClick={() => handleDownload(file)}
                          className="p-1.5 rounded-md hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity feed */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                {t("dashboard.recentActivity")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {activityLoading ? (
                <div className="p-4 space-y-3">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : (activity as any[]).length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">{t("logs.noLogs")}</div>
              ) : (
                <div className="divide-y divide-border">
                  {(activity as any[]).slice(0, 8).map((log: any) => (
                    <div key={log.id} className="px-4 py-2.5 hover:bg-accent/50 transition-colors">
                      <div className="flex items-start gap-2">
                        <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5", getActionColor(log.action))}>
                          {getActionLabel(log.action)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {log.userName} {log.fileName && `· ${log.fileName}`}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60">{formatDate(log.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

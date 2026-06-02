import { useState } from "react";
import { useLocation } from "wouter";
import {
  useGetDashboardStats,
  useGetRecentFiles,
  useGetRecentActivity,
  useListFiles,
  getListFilesQueryKey
} from "@workspace/api-client-react";

import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import {
  FileText,
  FolderOpen,
  Users,
  HardDrive,
  Upload,
  Search,
  Download,
  Clock,
  TrendingUp
} from "lucide-react";

import {
  formatBytes,
  formatDate,
  getFileIconEmoji,
  downloadFile
} from "@/lib/utils";

import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function DashboardPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [search, setSearch] = useState("");

  const { data: stats, isLoading: statsLoading } =
    useGetDashboardStats();

  const { data: recentFiles = [], isLoading: filesLoading } =
    useGetRecentFiles() as any;

  const { data: activity = [], isLoading: activityLoading } =
    useGetRecentActivity() as any;

  const { data: searchResults = [] } = useListFiles(
    { search },
    {
      query: {
        enabled: search.length >= 2,
        queryKey: getListFilesQueryKey({ search })
      }
    }
  );

  const statsCards = [
    {
      key: "totalFiles",
      label: "Всего файлов",
      value: stats?.totalFiles ?? 0,
      icon: FileText,
      color: "text-blue-400"
    },
    {
      key: "totalFolders",
      label: "Папки",
      value: stats?.totalFolders ?? 0,
      icon: FolderOpen,
      color: "text-amber-400"
    },
    {
      key: "totalUsers",
      label: "Пользователи",
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: "text-green-400"
    },
    {
      key: "storage",
      label: "Использовано места",
      value: formatBytes(stats?.totalSize ?? 0),
      icon: HardDrive,
      color: "text-purple-400"
    },
    {
      key: "uploadedToday",
      label: "Загружено сегодня",
      value: stats?.uploadedToday ?? 0,
      icon: Upload,
      color: "text-rose-400"
    }
  ];

  const getActionColor = (action: string) => {
    if (action === "upload")
      return "bg-blue-500/15 text-blue-400";

    if (action === "download")
      return "bg-green-500/15 text-green-400";

    if (
      action === "delete" ||
      action === "delete_folder" ||
      action === "delete_user"
    )
      return "bg-red-500/15 text-red-400";

    if (action === "login")
      return "bg-amber-500/15 text-amber-400";

    return "bg-muted text-muted-foreground";
  };

  const handleDownload = async (file: any) => {
    try {
      await downloadFile(
        file.id,
        file.originalName || file.name
      );
    } catch {
      toast({
        title: "Ошибка скачивания",
        variant: "destructive"
      });
    }
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              RAYAN A.F.
            </h1>

            <p className="text-sm text-muted-foreground mt-1">
              Rayan Hotel Archive System
            </p>
          </div>

          <TrendingUp className="w-6 h-6 text-primary hidden sm:block" />
        </div>

        {/* Search */}
        <div className="relative max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

          <Input
            placeholder="Быстрый поиск файлов..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border"
          />

          {search.length >= 2 &&
            searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl z-20 overflow-hidden">
                {(searchResults as any[])
                  .slice(0, 6)
                  .map((file: any) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent transition-colors cursor-pointer"
                      onClick={() => navigate("/archives")}
                    >
                      <span>
                        {getFileIconEmoji(file.mimeType)}
                      </span>

                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {file.name}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {formatBytes(file.size)}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
        </div>

        {/* QUICK ACTIONS */}
        <div className="flex flex-wrap gap-3">

          <Button
            onClick={() => navigate("/archives")}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            Загрузить файл
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate("/archives")}
            className="gap-2"
          >
            <FolderOpen className="w-4 h-4" />
            Открыть архив
          </Button>

        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {statsCards.map((stat) => {
            const Icon = stat.icon;

            return (
              <Card
                key={stat.key}
                className="bg-card border-border"
              >
                <CardContent className="p-4">
                  {statsLoading ? (
                    <Skeleton className="h-12 w-full" />
                  ) : (
                    <>
                      <div className={cn("mb-2", stat.color)}>
                        <Icon className="w-5 h-5" />
                      </div>

                      <p className="text-2xl font-bold text-foreground">
                        {stat.value}
                      </p>

                      <p className="text-xs text-muted-foreground mt-1">
                        {stat.label}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* RECENT FILES */}
          <Card className="lg:col-span-2 bg-card border-border">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Последние файлы
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0">

              {filesLoading ? (
                <div className="p-4 space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton
                      key={i}
                      className="h-10 w-full"
                    />
                  ))}
                </div>
              ) : (recentFiles as any[]).length === 0 ? (

                <div className="p-8 text-center text-muted-foreground text-sm">
                  Нет файлов
                </div>

              ) : (

                <div className="divide-y divide-border">

                  {(recentFiles as any[]).map((file: any) => (

                    <div
                      key={file.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors"
                    >

                      <span className="text-lg">
                        {getFileIconEmoji(file.mimeType)}
                      </span>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {file.name}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {formatBytes(file.size)} · {formatDate(file.createdAt)}
                        </p>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(file)}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Скачать
                      </Button>

                    </div>

                  ))}

                </div>

              )}

            </CardContent>
          </Card>

          {/* ACTIVITY */}
          <Card className="bg-card border-border">

            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Последние действия
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0">

              {activityLoading ? (
                <div className="p-4 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton
                      key={i}
                      className="h-8 w-full"
                    />
                  ))}
                </div>
              ) : (activity as any[]).length === 0 ? (

                <div className="p-6 text-center text-muted-foreground text-sm">
                  Нет записей
                </div>

              ) : (

                <div className="divide-y divide-border">

                  {(activity as any[])
                    .slice(0, 8)
                    .map((log: any) => (

                      <div
                        key={log.id}
                        className="px-4 py-3"
                      >

                        <span
                          className={cn(
                            "text-[10px] font-semibold px-2 py-1 rounded",
                            getActionColor(log.action)
                          )}
                        >
                          {log.action}
                        </span>

                        <p className="text-xs text-muted-foreground mt-2">
                          {log.userName}
                        </p>

                        <p className="text-[10px] text-muted-foreground/60">
                          {formatDate(log.createdAt)}
                        </p>

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

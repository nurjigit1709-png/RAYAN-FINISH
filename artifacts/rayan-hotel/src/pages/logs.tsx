import { useListLogs } from "@workspace/api-client-react";
import { useLanguage } from "@/lib/i18n";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivitySquare, Upload, Download, Trash2, LogIn, LogOut, FolderPlus, FolderMinus, UserPlus, UserMinus, UserX } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const ACTION_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  upload:        { icon: Upload,      color: "text-blue-400",   bg: "bg-blue-500/10" },
  download:      { icon: Download,    color: "text-green-400",  bg: "bg-green-500/10" },
  delete:        { icon: Trash2,      color: "text-red-400",    bg: "bg-red-500/10" },
  login:         { icon: LogIn,       color: "text-amber-400",  bg: "bg-amber-500/10" },
  logout:        { icon: LogOut,      color: "text-slate-400",  bg: "bg-slate-500/10" },
  create_folder: { icon: FolderPlus,  color: "text-teal-400",   bg: "bg-teal-500/10" },
  delete_folder: { icon: FolderMinus, color: "text-orange-400", bg: "bg-orange-500/10" },
  create_user:   { icon: UserPlus,    color: "text-violet-400", bg: "bg-violet-500/10" },
  delete_user:   { icon: UserMinus,   color: "text-red-400",    bg: "bg-red-500/10" },
  block_user:    { icon: UserX,       color: "text-rose-400",   bg: "bg-rose-500/10" },
};

export default function LogsPage() {
  const { t } = useLanguage();
  const { data: logs = [], isLoading } = useListLogs({});

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <ActivitySquare className="w-5 h-5 text-primary" />
          {t("logs.title")}
        </h1>

        <Card className="bg-card border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{t("logs.action")}</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{t("logs.user")}</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 hidden sm:table-cell">{t("logs.file")}</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{t("logs.time")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}><td colSpan={4} className="px-4 py-3"><Skeleton className="h-8 w-full" /></td></tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center text-sm text-muted-foreground py-10">{t("logs.noLogs")}</td>
                  </tr>
                ) : logs.map((log: any) => {
                  const cfg = ACTION_CONFIG[log.action] || ACTION_CONFIG.download;
                  const Icon = cfg.icon;
                  return (
                    <tr key={log.id} className="hover:bg-accent/40 transition-colors" data-testid={`log-row-${log.id}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={cn("p-1.5 rounded-md", cfg.bg)}>
                            <Icon className={cn("w-3.5 h-3.5", cfg.color)} />
                          </div>
                          <span className="text-sm text-foreground">{t(`actions.${log.action}`)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{log.userName || "—"}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">
                        {log.fileName || log.folderName || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(log.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Layout>
  );
}

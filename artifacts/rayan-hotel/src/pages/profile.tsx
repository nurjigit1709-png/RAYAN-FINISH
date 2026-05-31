import { useState, useRef } from "react";
import { useUpdateUser, useGetRecentActivity, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, Camera, Upload, User, TrendingUp, Upload as UploadIcon, MessageCircle, Phone } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ProfileTabProps {
  embedded?: boolean;
}

export default function ProfileTab({ embedded }: ProfileTabProps) {
  const { user, setToken } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const updateUser = useUpdateUser();
  const { data: activity = [] } = useGetRecentActivity();

  const handleSave = async () => {
    if (!user) return;
    await updateUser.mutateAsync({
      id: user.id,
      data: { name, email, ...(password ? { password } : {}) },
    });
    queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    toast({ title: t("profile.save") });
    setPassword("");
  };

  const handleAvatarUpload = async (files: FileList | null) => {
    if (!files || !user) return;
    setUploadingAvatar(true);
    const token = localStorage.getItem("rayan_token") || sessionStorage.getItem("rayan_token");
    const fd = new FormData();
    fd.append("avatar", files[0]);
    await fetch(`/api/users/${user.id}/avatar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    setUploadingAvatar(false);
    toast({ title: t("profile.changeAvatar") });
  };

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  const content = (
    <div className="space-y-6">
      {/* Avatar section */}
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="flex items-center gap-5 flex-wrap">
            <div className="relative group">
              <Avatar className="h-20 w-20 border-2 border-border">
                <AvatarImage src={user?.avatarUrl || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary text-2xl font-bold">{initials}</AvatarFallback>
              </Avatar>
              {user?.isPremium && (
                <Crown className="absolute -top-2 -right-2 w-5 h-5 text-amber-400 fill-amber-400" />
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                data-testid="btn-avatar-upload"
              >
                <Camera className="w-6 h-6 text-white" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => handleAvatarUpload(e.target.files)} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">{user?.name}</h2>
                {user?.isPremium && <Crown className="w-4 h-4 text-amber-400 fill-amber-400" />}
              </div>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <span className={cn(
                "inline-block mt-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full",
                user?.role === "super_admin" ? "bg-amber-500/15 text-amber-400" :
                user?.role === "manager" ? "bg-blue-500/15 text-blue-400" :
                user?.role === "programmer" ? "bg-purple-500/15 text-purple-400" :
                "bg-slate-500/15 text-slate-400"
              )}>
                {user?.role === "programmer" ? "Программист" : t(`roles.${user?.role}`)}
              </span>
            </div>
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}
              className="ml-auto" data-testid="btn-change-avatar">
              <UploadIcon className="w-3.5 h-3.5 mr-1.5" />
              {uploadingAvatar ? t("common.loading") : t("profile.changeAvatar")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit form */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-sm font-semibold">{t("profile.editProfile")}</CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">{t("profile.name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} data-testid="input-profile-name" />
            </div>
            <div>
              <Label className="text-sm">{t("profile.email")}</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                disabled={user?.role !== "programmer"}
                data-testid="input-profile-email" />
            </div>
          </div>
          <div className="max-w-sm">
            <Label className="text-sm">{t("profile.password")}</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to keep current" data-testid="input-profile-password" />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={updateUser.isPending} data-testid="btn-save-profile">
              {updateUser.isPending ? t("common.loading") : t("profile.save")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent activity */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            {t("profile.recentActivity")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {activity.filter((l: any) => l.userId === user?.id).slice(0, 8).map((log: any) => (
            <div key={log.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-0 hover:bg-accent/40 transition-colors" data-testid={`activity-${log.id}`}>
              <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{t(`actions.${log.action}`)}{log.fileName ? ` · ${log.fileName}` : ""}</p>
                <p className="text-xs text-muted-foreground">{formatDate(log.createdAt)}</p>
              </div>
            </div>
          ))}
          {activity.filter((l: any) => l.userId === user?.id).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">{t("logs.noLogs")}</p>
          )}
        </CardContent>
      </Card>

      {/* Support section */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-primary" />
            Поддержка
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground mb-4">
            По вопросам технической поддержки системы обращайтесь к программисту:
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="https://wa.me/996551002216"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-green-500/30 bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors text-sm font-medium"
            >
              <Phone className="w-4 h-4" />
              WhatsApp +996 551 002 216
            </a>
            <a
              href="https://t.me/tonvio"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors text-sm font-medium"
            >
              <MessageCircle className="w-4 h-4" />
              Telegram @tonvio
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (embedded) return content;

  return (
    <Layout>
      <div className="max-w-2xl space-y-1 animate-fade-in">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2 mb-6">
          <User className="w-5 h-5 text-primary" />
          {t("profile.title")}
        </h1>
        {content}
      </div>
    </Layout>
  );
}

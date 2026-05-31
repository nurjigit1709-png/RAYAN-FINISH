import { useState } from "react";
import {
  useListUsers, useCreateUser, useUpdateUser, useDeleteUser, useToggleBlockUser,
  getListUsersQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Users, Plus, Crown, ShieldCheck, Shield, User, Pencil, Trash2, Lock, Unlock, Code } from "lucide-react";
import { formatDateShort } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  manager: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  employee: "bg-slate-500/15 text-slate-400 border-slate-500/20",
  programmer: "bg-purple-500/15 text-purple-400 border-purple-500/20",
};

const ROLE_ICONS: Record<string, React.ElementType> = {
  super_admin: ShieldCheck,
  manager: Shield,
  employee: User,
  programmer: Code,
};

export default function EmployeesPage() {
  const { user: me } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);

  const { data: users = [], isLoading } = useListUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const toggleBlock = useToggleBlockUser();

  const isProgrammer = me?.role === "programmer";

  const emptyForm = { name: "", email: "", password: "", role: "employee" as const, isPremium: false };
  const [form, setForm] = useState(emptyForm);

  if (!isProgrammer) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-center animate-fade-in">
          <Shield className="w-12 h-12 text-muted-foreground/40" />
          <p className="text-muted-foreground font-medium">Раздел доступен только программисту</p>
          <p className="text-sm text-muted-foreground/60">Обратитесь в поддержку</p>
        </div>
      </Layout>
    );
  }

  const openEdit = (u: any) => {
    setForm({ name: u.name, email: u.email, password: "", role: u.role, isPremium: u.isPremium });
    setEditUser(u);
  };

  const handleSubmit = async () => {
    if (editUser) {
      await updateUser.mutateAsync({ id: editUser.id, data: { name: form.name, email: form.email, role: form.role, isPremium: form.isPremium, ...(form.password ? { password: form.password } : {}) } });
      toast({ title: "Сотрудник обновлён" });
    } else {
      await createUser.mutateAsync({ data: form });
      toast({ title: "Сотрудник добавлен" });
    }
    queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
    setShowAddDialog(false);
    setEditUser(null);
    setForm(emptyForm);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(t("common.confirm"))) return;
    await deleteUser.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
    toast({ title: `${name} удалён` });
  };

  const handleBlock = async (id: number, isBlocked: boolean) => {
    await toggleBlock.mutateAsync({ id, data: { isBlocked: !isBlocked } });
    queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
    toast({ title: isBlocked ? "Разблокирован" : "Заблокирован" });
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            {t("employees.title")}
          </h1>
          <Button size="sm" onClick={() => { setEditUser(null); setForm(emptyForm); setShowAddDialog(true); }} data-testid="btn-add-employee">
            <Plus className="w-3.5 h-3.5 mr-1.5" />{t("employees.add")}
          </Button>
        </div>

        <Card className="bg-card border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{t("employees.name")}</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 hidden sm:table-cell">{t("employees.email")}</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{t("employees.role")}</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 hidden md:table-cell">{t("employees.status")}</th>
                  <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3">{t("employees.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i}><td colSpan={5} className="px-4 py-3"><Skeleton className="h-10 w-full" /></td></tr>
                  ))
                ) : users.map((u: any) => {
                  const RoleIcon = ROLE_ICONS[u.role] || User;
                  const initials = u.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
                  return (
                    <tr key={u.id} className="hover:bg-accent/40 transition-colors" data-testid={`user-row-${u.id}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="h-8 w-8 border border-border">
                              <AvatarImage src={u.avatarUrl || undefined} />
                              <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">{initials}</AvatarFallback>
                            </Avatar>
                            {u.isPremium && <Crown className="absolute -top-1.5 -right-1.5 w-3 h-3 text-amber-400 fill-amber-400" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{u.name}</p>
                            <p className="text-xs text-muted-foreground sm:hidden">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border", ROLE_COLORS[u.role])}>
                          <RoleIcon className="w-3 h-3" />
                          {u.role === "programmer" ? "Программист" : t(`roles.${u.role}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", u.isBlocked ? "bg-destructive/15 text-destructive" : "bg-green-500/15 text-green-400")}>
                          {u.isBlocked ? t("status.blocked") : t("status.active")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => { openEdit(u); setShowAddDialog(true); }}
                            className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            data-testid={`btn-edit-${u.id}`}>
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleBlock(u.id, u.isBlocked)}
                            className="p-1.5 rounded text-muted-foreground hover:text-amber-400 hover:bg-amber-400/10 transition-colors"
                            data-testid={`btn-block-${u.id}`}>
                            {u.isBlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                          </button>
                          {u.id !== me?.id && (
                            <button onClick={() => handleDelete(u.id, u.name)}
                              className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              data-testid={`btn-delete-${u.id}`}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Dialog open={showAddDialog} onOpenChange={(v) => { setShowAddDialog(v); if (!v) { setEditUser(null); setForm(emptyForm); } }}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>{editUser ? t("employees.edit") : t("employees.add")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-sm">{t("employees.name")}</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-user-name" /></div>
              <div><Label className="text-sm">{t("employees.email")}</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="input-user-email" /></div>
              <div><Label className="text-sm">{t("profile.password")}</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={editUser ? "Оставьте пустым чтобы не менять" : ""} data-testid="input-user-password" /></div>
              <div><Label className="text-sm">{t("employees.role")}</Label>
                <Select value={form.role} onValueChange={(v: any) => setForm({ ...form, role: v })}>
                  <SelectTrigger data-testid="select-user-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">{t("roles.super_admin")}</SelectItem>
                    <SelectItem value="manager">{t("roles.manager")}</SelectItem>
                    <SelectItem value="employee">{t("roles.employee")}</SelectItem>
                    <SelectItem value="programmer">Программист</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />{t("employees.premium")}
                </Label>
                <Switch checked={form.isPremium} onCheckedChange={(v) => setForm({ ...form, isPremium: v })} data-testid="switch-premium" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowAddDialog(false); setEditUser(null); setForm(emptyForm); }}>{t("common.cancel")}</Button>
              <Button onClick={handleSubmit} disabled={createUser.isPending || updateUser.isPending} data-testid="btn-save-user">{t("common.save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

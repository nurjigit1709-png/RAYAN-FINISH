import { useState } from "react";
import {
  useListCategories, useCreateCategory, useDeleteCategory,
  getListCategoriesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Settings, Plus, Trash2, FolderOpen, Briefcase, FileText, DollarSign, Camera, BookOpen, Building2, Layers } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ProfileTab from "./profile";

const ICONS = [
  { value: "Folder", label: "Folder", icon: FolderOpen },
  { value: "Briefcase", label: "Briefcase", icon: Briefcase },
  { value: "FileText", label: "File Text", icon: FileText },
  { value: "DollarSign", label: "Dollar Sign", icon: DollarSign },
  { value: "Camera", label: "Camera", icon: Camera },
  { value: "BookOpen", label: "Book", icon: BookOpen },
  { value: "Building2", label: "Building", icon: Building2 },
  { value: "Archive", label: "Archive", icon: Layers },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("Folder");

  const { data: categories = [], isLoading } = useListCategories();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();

  const isSuperAdmin = user?.role === "super_admin";

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createCategory.mutateAsync({ data: { name: newName.trim(), icon: newIcon } });
    queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
    setNewName("");
    setNewIcon("Folder");
    setShowCreate(false);
    toast({ title: "Section created" });
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(t("common.confirm"))) return;
    await deleteCategory.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
    toast({ title: `${name} deleted` });
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          {t("settings.title")}
        </h1>

        <Tabs defaultValue="profile">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="profile" data-testid="tab-profile">{t("settings.profile")}</TabsTrigger>
            {isSuperAdmin && <TabsTrigger value="sections" data-testid="tab-sections">{t("settings.sections")}</TabsTrigger>}
          </TabsList>

          <TabsContent value="profile" className="mt-4">
            <ProfileTab embedded />
          </TabsContent>

          {isSuperAdmin && (
            <TabsContent value="sections" className="mt-4">
              <Card className="bg-card border-border">
                <CardHeader className="border-b border-border pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">{t("settings.sections")}</CardTitle>
                    <Button size="sm" onClick={() => setShowCreate(true)} data-testid="btn-create-section">
                      <Plus className="w-3.5 h-3.5 mr-1.5" />{t("settings.createSection")}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {categories.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">{t("settings.noSections")}</p>
                  ) : (
                    <div className="divide-y divide-border">
                      {categories.map((cat: any) => {
                        const IconComp = ICONS.find((i) => i.value === cat.icon)?.icon || FolderOpen;
                        return (
                          <div key={cat.id} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors" data-testid={`category-${cat.id}`}>
                            <div className="p-1.5 rounded-md bg-primary/10">
                              <IconComp className="w-4 h-4 text-primary" />
                            </div>
                            <p className="flex-1 text-sm font-medium text-foreground">{cat.name}</p>
                            <button onClick={() => handleDelete(cat.id, cat.name)}
                              className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              data-testid={`btn-delete-cat-${cat.id}`}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle>{t("settings.createSection")}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-sm">{t("settings.sectionName")}</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Финансы" data-testid="input-section-name" autoFocus />
              </div>
              <div>
                <Label className="text-sm">{t("settings.sectionIcon")}</Label>
                <Select value={newIcon} onValueChange={setNewIcon}>
                  <SelectTrigger data-testid="select-section-icon"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ICONS.map((ic) => (
                      <SelectItem key={ic.value} value={ic.value}>{ic.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>{t("common.cancel")}</Button>
              <Button onClick={handleCreate} disabled={createCategory.isPending} data-testid="btn-confirm-section">{t("common.create")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Archive, Users, ActivitySquare, Settings, LogOut,
  Crown, ChevronRight, Menu, X, User, Moon, Sun, FolderOpen,
  Briefcase, FileText, DollarSign, Camera, BookOpen, Building2, MessageCircle
} from "lucide-react";
import rayanLogo from "/rayan-logo.jpeg";
import { useAuth } from "@/lib/auth";
import { useLanguage, type Language } from "@/lib/i18n";
import { useListCategories } from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ElementType> = {
  Folder: FolderOpen,
  Briefcase: Briefcase,
  FileText: FileText,
  DollarSign: DollarSign,
  Camera: Camera,
  BookOpen: BookOpen,
  Building2: Building2,
  Archive: Archive,
};

interface SidebarProps {
  darkMode: boolean;
  onToggleDark: () => void;
}

export default function Sidebar({ darkMode, onToggleDark }: SidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: categories = [] } = useListCategories();

  const isProgrammer = user?.role === "programmer";

  const navItems = [
    { href: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: "/archives", label: t("nav.archives"), icon: Archive },
    ...categories.map((cat) => ({
      href: `/category/${cat.id}`,
      label: cat.name,
      icon: ICON_MAP[cat.icon] || FolderOpen,
      isCat: true,
    })),
    { href: "/chat", label: "Чат", icon: MessageCircle },
    ...(isProgrammer
      ? [{ href: "/employees", label: t("nav.employees"), icon: Users }]
      : []),
    ...(isProgrammer || user?.role === "super_admin"
      ? [{ href: "/logs", label: t("nav.logs"), icon: ActivitySquare }]
      : []),
    { href: "/settings", label: t("nav.settings"), icon: Settings },
  ];

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-sidebar-border">
        <img src={rayanLogo} alt="Rayan Hotel" className="h-10 w-auto object-contain flex-shrink-0" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || location.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "sidebar-item",
                  isActive && "active",
                  (item as any).isCat && "pl-6 text-xs"
                )}
                onClick={() => setMobileOpen(false)}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
                {isActive && <ChevronRight className="w-3 h-3 opacity-50" />}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        {/* Theme + Language */}
        <div className="flex items-center gap-1 px-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={onToggleDark}
          >
            {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </Button>
          <div className="flex gap-0.5 ml-1">
            {(["RU", "EN", "KY"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l.toLowerCase() as Language)}
                className={cn(
                  "text-[10px] font-semibold px-1.5 py-0.5 rounded transition-all",
                  lang === l.toLowerCase()
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* User profile */}
        <Link href="/profile">
          <div
            className="flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-sidebar-accent transition-colors cursor-pointer"
            onClick={() => setMobileOpen(false)}
          >
            <div className="relative flex-shrink-0">
              <Avatar className="h-8 w-8 border border-sidebar-border">
                <AvatarImage src={user?.avatarUrl || undefined} alt={user?.name} />
                <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {user?.isPremium && (
                <Crown className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name}</p>
              <p className="text-[10px] text-sidebar-foreground/50 truncate">
                {user?.role === "super_admin" ? t("roles.super_admin")
                  : user?.role === "manager" ? t("roles.manager")
                  : user?.role === "programmer" ? "Программист"
                  : t("roles.employee")}
              </p>
            </div>
            <User className="w-3.5 h-3.5 text-sidebar-foreground/40 flex-shrink-0" />
          </div>
        </Link>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
          {t("nav.logout")}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="fixed top-3 right-3 z-50 p-2 rounded-md bg-sidebar text-sidebar-foreground md:hidden shadow-lg"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-40 w-56 bg-sidebar flex flex-col transition-transform duration-300 ease-in-out border-l border-sidebar-border",
          "md:translate-x-0 md:static md:z-auto",
          mobileOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
}

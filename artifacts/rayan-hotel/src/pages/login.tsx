import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { setAuthTokenGetter } from "@workspace/api-client-react/src/custom-fetch";
import { useAuth } from "@/lib/auth";
import { useLanguage, type Language } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import rayanLogo from "/rayan-logo.jpeg";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { setToken, user } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const [email, setEmail] = useState(() => localStorage.getItem("rayan_saved_email") || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(() => !!localStorage.getItem("rayan_saved_email"));
  const [error, setError] = useState("");

  const login = useLogin({
    mutation: {
      onSuccess: (data: any) => {
        if (remember) {
          localStorage.setItem("rayan_saved_email", email);
        } else {
          localStorage.removeItem("rayan_saved_email");
        }
        setAuthTokenGetter(() => data.token);
        setToken(data.token, remember);
        setLocation("/dashboard");
      },
      onError: () => {
        setError("Неверный email или пароль");
      },
    },
  });

  useEffect(() => {
    if (user) setLocation("/dashboard");
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    login.mutate({ data: { email, password } });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 50%, #f5f0ff 100%)" }}>

      {/* Soft background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full opacity-40"
          style={{ background: "radial-gradient(circle, #c7d2fe, transparent)" }} />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-40"
          style={{ background: "radial-gradient(circle, #ddd6fe, transparent)" }} />
        <div className="absolute top-1/2 left-1/4 w-48 h-48 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #bfdbfe, transparent)" }} />
      </div>

      {/* Language switcher */}
      <div className="absolute top-4 right-4 flex gap-1">
        {(["RU", "EN", "KY"] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l.toLowerCase() as Language)}
            className={cn(
              "text-xs font-semibold px-2.5 py-1 rounded-md transition-all border",
              lang === l.toLowerCase()
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                : "text-gray-500 border-gray-200 bg-white hover:bg-gray-50"
            )}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Login card — always white */}
      <div className="w-full max-w-sm relative">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xl shadow-gray-200/60 p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="rounded-xl overflow-hidden mb-3 shadow-sm border border-gray-100">
              <img
                src={rayanLogo}
                alt="Rayan Hotel"
                className="h-20 w-auto object-contain"
              />
            </div>
            <p className="text-xs text-gray-400 text-center tracking-wide">
              {t("login.subtitle")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                {t("login.email")}
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:ring-indigo-100"
                  placeholder="user@rayan.kg"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                {t("login.password")}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-9 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:ring-indigo-100"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center gap-2">
              <input
                id="remember"
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer select-none">
                Запомнить меня
              </label>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full font-semibold py-2.5 text-white transition-all shadow-md"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
              disabled={login.isPending}
            >
              {login.isPending ? t("common.loading") : t("login.button")}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Rayan Hotel &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

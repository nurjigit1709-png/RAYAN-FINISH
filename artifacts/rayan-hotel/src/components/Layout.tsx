import { ReactNode, useEffect, useState } from "react";
import Sidebar from "./Sidebar";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("rayan_theme");
    if (saved === null) return false;
    return saved === "dark";
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("rayan_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("rayan_theme", "light");
    }
  }, [darkMode]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <main className="flex-1 overflow-y-auto md:mr-0">
        <div className="min-h-full p-4 md:p-6 pt-14 md:pt-6">
          {children}
        </div>
      </main>
      <Sidebar darkMode={darkMode} onToggleDark={() => setDarkMode(!darkMode)} />
    </div>
  );
}

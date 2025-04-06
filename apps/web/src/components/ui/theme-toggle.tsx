"use client";

import { Moon, Sun } from "lucide-react";
import { TooltipIconButton } from "@/components/ui/assistant-ui/tooltip-icon-button";
import useLocalStorage from "@/hooks/useLocalStorage";
import { useEffect } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useLocalStorage<"light" | "dark">("theme", "light");

  // Initialize theme based on system preference when no saved preference exists
  useEffect(() => {
    // Initialize theme based on localStorage or system preference
    const savedTheme = localStorage.getItem("theme");
    if (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }
  }, [setTheme]);

  // Apply theme class to HTML element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    
    // Dispatch custom event for components that need to respond to theme changes
    window.dispatchEvent(new Event('themechange'));
  }, [theme]);

  // Toggle between light and dark mode
  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <TooltipIconButton
      tooltip={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
      variant="ghost"
      className="w-8 h-8"
      delayDuration={400}
      onClick={toggleTheme}
    >
      {theme === "light" ? (
        <Moon className="h-5 w-5 text-foreground" />
      ) : (
        <Sun className="h-5 w-5 text-foreground" />
      )}
    </TooltipIconButton>
  );
} 
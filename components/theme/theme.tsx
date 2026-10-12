"use client";

import { useEffect } from "react";

import { useLocalStorage } from "@/lib/use-local-storage";

export type ThemePreference = "light" | "dark" | "system";

const THEME_KEY = "guava.theme";
const DEFAULT_THEME: ThemePreference = "system";
const isTheme = (v: unknown): v is ThemePreference =>
  v === "light" || v === "dark" || v === "system";

/**
 * Runs before first paint (inlined in <head>) so the right theme class is on
 * <html> before anything renders. Keep in sync with `applyTheme` below.
 */
export const themeScript = `(function(){try{var t=JSON.parse(localStorage.getItem(${JSON.stringify(THEME_KEY)})||'"system"');var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;

function applyTheme(pref: ThemePreference) {
  const dark =
    pref === "dark" ||
    (pref === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function useTheme() {
  return useLocalStorage<ThemePreference>(THEME_KEY, DEFAULT_THEME, isTheme);
}

/** Keeps the <html> class in sync with the stored preference and the OS setting. */
export function ThemeSync() {
  const [theme] = useTheme();
  useEffect(() => {
    applyTheme(theme);
    if (theme !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);
  return null;
}

"use client";

import { ThemeProvider } from "next-themes";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { initStore } from "@/data/store";

/** Theme, toasts and one-time loading of the saved demo data. */
export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void initStore();
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      {children}
      <Toaster position="top-right" richColors closeButton />
    </ThemeProvider>
  );
}

"use client";

import { useState, useSyncExternalStore } from "react";

import { toast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { install, installWay, subscribeToInstall, type InstallWay } from "@/lib/install-prompt";

const WHAT: Record<InstallWay, string> = {
  installed: "Dossier is running as an app on this device.",
  insecure: "Browsers install an app only from a page served over HTTPS, or from localhost, and this one is on plain HTTP. Put the server behind HTTPS and the choice appears here.",
  prompt: "Add Dossier to this device's home screen or app list, so it opens in a window of its own like any other app.",
  ios: "In Safari, tap the Share button, then Add to Home Screen. Dossier then opens in a window of its own, like any other app.",
  menu: "Open your browser's menu and choose Install app, or Add to Home screen. Not every browser offers it.",
};

/**
 * Settings → About: installing Dossier as an app on this device (a PWA). A
 * browser that has a dialog for it gets a button; Safari on an iPhone has none,
 * so the row says where to tap. See src/lib/install-prompt.ts.
 */
export function InstallApp() {
  const way = useSyncExternalStore(subscribeToInstall, installWay, (): InstallWay => "menu");
  const [asking, setAsking] = useState(false);

  const ask = async () => {
    setAsking(true);
    try {
      if (await install()) toast("Dossier is installed.");
    } catch {
      toast("The browser couldn't open its install dialog. Its menu has the same choice.");
    } finally {
      setAsking(false);
    }
  };

  return (
    <Card padding="none" className="flex flex-wrap items-center justify-between gap-3 px-7 py-4">
      <div className="flex min-w-0 max-w-[560px] flex-col gap-0.5">
        <span className="text-sm font-medium">Install as an app</span>
        <span className="text-meta text-muted">{WHAT[way]}</span>
      </div>
      {way === "prompt" && (
        <Button variant="secondary" size="sm" aria-disabled={asking || undefined} onClick={() => !asking && void ask()}>
          Install
        </Button>
      )}
    </Card>
  );
}

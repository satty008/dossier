import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { connection } from "next/server";

import { ServiceWorker } from "@/components/service-worker";
import { Toaster } from "@/components/toast";
import { isDesktopApp } from "@/lib/desktop";
import { fontVariables } from "@/fonts";
import { themeColors } from "@/lib/pwa";
import { COLOR_SCHEME_COOKIE, parseColorScheme } from "@/lib/ui-preferences";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Dossier", template: "%s · Dossier" },
  description: "Your job search, on your server.",
  // Added to a phone's home screen, it opens as an app (src/app/manifest.ts), named as here.
  applicationName: "Dossier",
  appleWebApp: { capable: true, title: "Dossier", statusBarStyle: "default" },
  // Safari would turn the phone numbers in a profile or a resume preview into links.
  formatDetection: { telephone: false, email: false, address: false },
};

/**
 * The colour of the browser's bar follows the scheme chosen in the sidebar,
 * which a media query can't see (the choice is a cookie); without a choice, the
 * system's, in each scheme's colour. The page is never made unzoomable.
 */
export async function generateViewport(): Promise<Viewport> {
  return { themeColor: themeColors(parseColorScheme((await cookies()).get(COLOR_SCHEME_COOKIE)?.value)) };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Every page renders per request: its scripts carry that request's CSP nonce (E11-5).
  await connection();
  // Light or dark as chosen in the sidebar; without a choice, the system's.
  const scheme = parseColorScheme((await cookies()).get(COLOR_SCHEME_COOKIE)?.value);
  return (
    <html lang="en" data-theme={scheme} className={`${fontVariables} h-full antialiased`}>
      <body className="min-h-full">
        {children}
        <Toaster />
        {/* The desktop app is a window of its own already. */}
        {!isDesktopApp() && <ServiceWorker />}
      </body>
    </html>
  );
}

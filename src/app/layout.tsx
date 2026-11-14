import type { Metadata, Viewport } from "next";
import { Outfit, Syne } from "next/font/google";
import { Toaster } from "sonner";
import { InstallPrompt } from "@/components/ui/install-prompt";
import "./globals.css";

const body = Outfit({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const display = Syne({ subsets: ["latin"], variable: "--font-display", weight: ["500", "600", "700", "800"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Home Flavour Catering", template: "%s · Home Flavour Catering" },
  description: "Office lunch, one tap. Order before cutoff, delivered to your desk.",
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "32x32" }, { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: "Home Flavour", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#070b0a", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable} dark`}>
      <body className="bg-grain font-sans antialiased">
        <div className="blob-layer" aria-hidden>
          <div className="blob blob-a" />
          <div className="blob blob-b" />
          <div className="blob blob-c" />
        </div>
        <div className="app-shell">{children}</div>
        <InstallPrompt />
        <Toaster theme="dark" position="top-center" toastOptions={{ style: { background: "#111916", border: "1px solid #2dd4bf33", color: "#eef3f0" } }} />
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Bengali } from "next/font/google";
import { InstallPrompt } from "@/components/ui/install-prompt";
import { AppToaster } from "@/components/theme/toaster";
import "./globals.css";

const body = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const bengali = Noto_Sans_Bengali({ subsets: ["bengali"], weight: ["400", "500", "600", "700"], variable: "--font-bengali", display: "swap" });

const themeBoot = `(function(){try{var k="hfc-theme";var s=localStorage.getItem(k);var dark=s==="dark"||(s!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.remove("light","dark");r.classList.add(dark?"dark":"light");r.style.colorScheme=dark?"dark":"light";}catch(e){}})();`;

export const metadata: Metadata = {
  title: { default: "Home Flavour Catering", template: "%s · Home Flavour Catering" },
  description: "Office lunch, one tap. Order before cutoff, delivered to your floor.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: "Home Flavour", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F4F1" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0B12" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${bengali.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body className="bg-grain font-sans antialiased">
        <div className="blob-layer" aria-hidden>
          <div className="blob blob-a" />
          <div className="blob blob-b" />
          <div className="blob blob-c" />
        </div>
        <div className="app-shell">
          {children}
          <InstallPrompt />
          <AppToaster />
        </div>
      </body>
    </html>
  );
}

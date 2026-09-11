import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import BottomNav from "@/components/BottomNav";
import ChatWidget from "@/components/ChatWidget";
import WhatsAppFooter from "@/components/WhatsAppFooter";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL('https://aifootballp.com'),
  title: {
    default: "Ennovera | Premier League 2026-27",
    template: "%s | Ennovera",
  },
  description:
    "AI-powered Premier League 2026-27 predictions and match analytics — powered by Ennovera.",
  applicationName: "Ennovera",
  keywords: [
    "Premier League",
    "EPL 2026-27",
    "AI predictions",
    "football predictions",
    "SHAP analysis",
    "Ennovera",
  ],
  authors: [{ name: "Ennovera" }],
  creator: "Ennovera",
  publisher: "Ennovera",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Ennovera",
    title: "Ennovera | Premier League 2026-27",
    description:
      "AI-powered Premier League 2026-27 predictions and match analytics.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Ennovera",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ennovera | Premier League 2026-27",
    description:
      "AI-powered Premier League 2026-27 predictions and match analytics.",
    images: ["/og-image.png"],
    creator: "@innovera_ai",
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#F0A500",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} antialiased bg-[#0D1117] text-[#E6EDF3]`}
      >
        <AuthProvider>
          <div className="pb-20 md:pb-0">
            {children}
            <WhatsAppFooter />
          </div>
          <BottomNav />
          <ChatWidget />
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}

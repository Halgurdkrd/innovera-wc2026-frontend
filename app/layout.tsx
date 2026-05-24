import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Innovera World Cup AI Predictor",
    template: "%s | Innovera Predictor",
  },
  description:
    "AI-powered FIFA World Cup 2026 predictions, luck scores, momentum analytics, and group standings — powered by Innovera.",
  applicationName: "Innovera World Cup AI Predictor",
  keywords: [
    "World Cup 2026",
    "FIFA 2026",
    "AI predictions",
    "football predictions",
    "luck score",
    "SHAP analysis",
    "Innovera",
  ],
  authors: [{ name: "Innovera" }],
  creator: "Innovera",
  publisher: "Innovera",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Innovera World Cup AI Predictor",
    title: "Innovera World Cup AI Predictor",
    description:
      "AI-powered FIFA World Cup 2026 predictions, luck scores, and team analytics.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Innovera World Cup AI Predictor",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Innovera World Cup AI Predictor",
    description:
      "AI-powered FIFA World Cup 2026 predictions, luck scores, and team analytics.",
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
        {children}
      </body>
    </html>
  );
}

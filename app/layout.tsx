import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Innovera — AI World Cup 2026 Predictions",
  description: "AI-powered predictions and luck scores for FIFA World Cup 2026",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-[#0D1117] text-[#E6EDF3]`}>
        {children}
      </body>
    </html>
  );
}

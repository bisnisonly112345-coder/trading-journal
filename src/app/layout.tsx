import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ClientOnly from "@/components/ClientOnly";
import Navbar from "@/components/Navbar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Trading Journal",
  description: "Website pribadi untuk mencatat trading, cash flow, dan performa akun",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="min-h-screen bg-zinc-100 text-zinc-900">
        <Navbar />
        <main className="mx-auto max-w-5xl px-4 py-6">
          <ClientOnly>{children}</ClientOnly>
        </main>
      </body>
    </html>
  );
}
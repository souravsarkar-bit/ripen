import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Ripen",
  description: "Farms overview",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}>
        <div className="min-h-dvh flex">
          <aside className="hidden md:flex w-64 shrink-0 border-r border-gray-200 bg-white flex-col">
            <div className="h-16 flex items-center px-4 border-b">
              <Link href="/" className="text-2xl font-semibold text-emerald-700">Ripen</Link>
            </div>
            <nav className="p-2 space-y-1 text-sm">
              <Link href="/" className="flex items-center gap-2 px-3 py-2 rounded-md bg-emerald-50 text-emerald-900">🌿 Farms</Link>
            </nav>
          </aside>
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}

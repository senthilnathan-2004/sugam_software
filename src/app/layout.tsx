import type { Metadata } from "next";
import "./globals.css";
import { RootProvider } from "@/providers/root-provider";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: "Sugam HMS",
  description: "Offline-first Hospital Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", inter.variable)}>
      <body className="antialiased font-sans bg-background text-foreground transition-colors duration-150">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}

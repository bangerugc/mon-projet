import type { Metadata } from "next";
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
  title: "Auto-Captions",
  description: "Sous-titres automatiques : transcris, édite, exporte.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // App sombre par défaut (§7 : ne pas polluer la perception des couleurs
  // de la vidéo). Le token --color-bg vient de globals.css.
  return (
    <html lang="fr" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-dvh bg-bg text-ink antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

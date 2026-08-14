import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display, Fleur_De_Leah } from "next/font/google";
import { ToastProvider } from "@/contexts/ToastContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fleurDeLeah = Fleur_De_Leah({
  variable: "--font-fleur-de-leah",
  subsets: ["latin"],
  weight: "400",
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  // Absolute URLs for OG images; Vercel sets VERCEL_PROJECT_PRODUCTION_URL itself.
  metadataBase: new URL(
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'http://localhost:3000'
  ),
  title: "Mira & Kamal's Engagement",
  description: "Find your table assignment for Mira & Kamal's engagement celebration",
  // Icons come from src/app/icon.png + favicon.ico via Next's file convention.
  openGraph: {
    title: "Mira & Kamal's Engagement",
    description: "Find your table assignment for Mira & Kamal's engagement celebration",
    images: ['/logo.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fleurDeLeah.variable} ${playfairDisplay.variable} antialiased`}
        suppressHydrationWarning
      >
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}

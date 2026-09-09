import type { Metadata, Viewport } from "next";
import {
  Geist,
  Geist_Mono,
  Playfair_Display,
  Fleur_De_Leah,
  Rouge_Script,
  Cormorant_Garamond,
} from "next/font/google";
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

// Garden home page (Claude Design "Enchanted Gardens Bridal Shower UI")
const rougeScript = Rouge_Script({
  variable: "--font-script",
  subsets: ["latin"],
  weight: "400",
});

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

// Mobile: fill the notch area so the admin bottom nav can sit on the safe
// inset, and keep pinch-zoom available for the seating chart.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#fafaf9",
};

export const metadata: Metadata = {
  // Absolute URLs for OG images; Vercel sets VERCEL_PROJECT_PRODUCTION_URL itself.
  metadataBase: new URL(
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'http://localhost:3000'
  ),
  // Event-specific title and description come from the settings row, applied by
  // the home page's generateMetadata. These are the fallbacks for every other
  // route (and for a home page rendered without a database).
  title: 'Find Your Table',
  description: 'Look up your table assignment for the celebration',
  // Icons come from src/app/icon.png + favicon.ico via Next's file convention.
  openGraph: {
    title: 'Find Your Table',
    description: 'Look up your table assignment for the celebration',
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
        className={`${geistSans.variable} ${geistMono.variable} ${fleurDeLeah.variable} ${playfairDisplay.variable} ${rougeScript.variable} ${cormorantGaramond.variable} antialiased`}
        suppressHydrationWarning
      >
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}

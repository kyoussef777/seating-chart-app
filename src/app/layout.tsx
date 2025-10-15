import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Mira & Kamal's Engagement",
  description: "Find your table assignment for Mira & Kamal's engagement celebration",
  icons: {
    icon: '/logo-bg.png',
    apple: '/logo-bg.png',
  },
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
      <head>
        <link rel="icon" href="/logo-bg.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo-bg.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}

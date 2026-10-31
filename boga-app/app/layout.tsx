import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import ServiceWorker from "@/src/components/ServiceWorker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: 'BOGA Training',
  description: 'Forge Your Strength',
  applicationName: 'BOGA',
  icons: {
    icon: '/boga.png',
    apple: '/boga.png',
  },
  manifest: '/manifest.json',
  // iOS ana ekrana eklendiğinde tam ekran açılsın
  appleWebApp: {
    capable: true,
    title: 'BOGA',
    statusBarStyle: 'black-translucent',
  },
}

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} antialiased bg-black`}
      >
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}

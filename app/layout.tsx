import type { Metadata, Viewport } from "next";
import "./globals.css";
import RegisterSW from "../components/RegisterSW";
import RevenueCatBootstrap from "../components/RevenueCatBootstrap";

export const metadata: Metadata = {
  title: "GeekFon Society",
  description: "Animated music universe hub and artist pages",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1A1A1A",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <RegisterSW />
        <RevenueCatBootstrap />
        {children}
      </body>
    </html>
  );
}

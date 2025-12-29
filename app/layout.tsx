import type { Metadata } from "next";
import "./globals.css";
import NotificationSetup from "@/components/NotificationSetup";

export const metadata: Metadata = {
  title: "LifeMaxxing Royale",
  description: "A high-stakes personal development game",
  manifest: "/manifest.json",
  themeColor: "#0f172a",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LifeMaxxing Royale",
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
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="LifeMaxxing Royale" />
      </head>
      <body>
        <NotificationSetup />
        {children}
      </body>
    </html>
  );
}


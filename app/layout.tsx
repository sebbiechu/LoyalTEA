import type { Metadata, Viewport } from "next";
// Fonts ship inside the app (from npm), so phones never contact Google or any other third party.
import "@fontsource/fredoka/500.css";
import "@fontsource/fredoka/600.css";
import "@fontsource/nunito-sans/400.css";
import "@fontsource/nunito-sans/600.css";
import "@fontsource/nunito-sans/700.css";
import "@fontsource/nunito-sans/800.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "LoyalTEA",
  description: "Your canteen stamp card. No sign-up, no personal details.",
  appleWebApp: { capable: true, title: "LoyalTEA", statusBarStyle: "black-translucent" },
  icons: { apple: "/apple-touch-icon.png" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#ec008c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}

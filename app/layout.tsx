import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LoyalTEA — Office Coffee Loyalty Card",
  description: "Earn stamps, redeem free drinks. Your digital loyalty card for the office canteen.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-brand-cream text-brand-green-dark">
        {children}
      </body>
    </html>
  );
}

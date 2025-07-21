import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Test Stripe",
  description: "Test d'intégration Stripe avec Next.js",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}

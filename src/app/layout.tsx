import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Palab | Rencontres internationales — profils vérifiés, chat et vidéo",
  description:
    "Palab met en relation des hommes du monde entier avec des femmes vérifiées une à une. Messages, lettres et chat vidéo en direct, en toute sécurité.",
};

export const viewport: Viewport = {
  themeColor: "#E0314B",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}

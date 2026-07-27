import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CC Integration App",
  description:
    "Turn discovery material into a developer-ready HubSpot integration scoping package.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}

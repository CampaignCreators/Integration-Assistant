import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Integration Assistant",
  description:
    "Turn discovery notes into a HubSpot integration mapping, brief, and developer handoff.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

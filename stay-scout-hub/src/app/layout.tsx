import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stay Scout Hub",
  description: "Find the perfect area and hotel for your trip",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Summer School Finder",
  description: "Discover your perfect summer school program worldwide",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}

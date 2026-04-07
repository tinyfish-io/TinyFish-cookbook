import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SafeDine — Restaurant Safety Intelligence",
  description: "Compare restaurants for allergen safety and dietary needs",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}

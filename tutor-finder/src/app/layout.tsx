import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TutorFinder",
  description: "Find expert exam tutors across multiple platforms",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}

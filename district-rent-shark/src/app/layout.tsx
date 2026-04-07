import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "District Rent Shark",
  description: "English-first apartment hunting in Vietnam — powered by TinyFish browser agents. Trust scoring, building rules, neighborhood vibes, and interactive map.",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "District Rent Shark",
    description: "English-first apartment hunting in Vietnam — powered by TinyFish browser agents. Trust scoring, building rules, neighborhood vibes, and interactive map.",
    url: "https://district-rent-shark.vercel.app",
    siteName: "District Rent Shark",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "District Rent Shark",
    description: "English-first apartment hunting in Vietnam — powered by TinyFish browser agents.",
  },
  metadataBase: new URL("https://district-rent-shark.vercel.app"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

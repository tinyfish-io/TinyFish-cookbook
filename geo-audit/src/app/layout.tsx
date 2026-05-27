import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Playfair_Display } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "700", "900"],
});

export const metadata: Metadata = {
  title: "GEO — Generative Engine Optimization Audit",
  description:
    "Audit how ChatGPT, Claude, and Perplexity understand your website. Not search ranking. Not keywords. Answer-engine comprehension.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "GEO — Generative Engine Optimization Audit",
    description:
      "Audit how ChatGPT, Claude, and Perplexity understand your website.",
    url: "/",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GEO — Generative Engine Optimization Audit",
    description:
      "Audit how ChatGPT, Claude, and Perplexity understand your website.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

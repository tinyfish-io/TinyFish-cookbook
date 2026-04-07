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
  title: "Pharmacy Panic",
  description: "Compare medicine prices across Vietnam's pharmacy chains in seconds — powered by TinyFish parallel browser agents.",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "Pharmacy Panic",
    description: "Compare medicine prices across Vietnam's pharmacy chains in seconds. Searches 20+ pharmacies simultaneously.",
    url: "https://pharmacy-panic.vercel.app",
    siteName: "Pharmacy Panic",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pharmacy Panic",
    description: "Compare medicine prices across Vietnam's pharmacy chains in seconds. Powered by TinyFish parallel browser agents.",
  },
  metadataBase: new URL("https://pharmacy-panic.vercel.app"),
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

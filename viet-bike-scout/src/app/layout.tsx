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
  title: "Viet Bike Price Scout",
  description: "Compare motorbike rental prices across Vietnam in seconds — powered by TinyFish Mino parallel browser agents.",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "Viet Bike Price Scout",
    description: "Compare motorbike rental prices across Vietnam in seconds. Searches 20+ rental shops in HCMC, Hanoi, Da Nang & Nha Trang simultaneously.",
    url: "https://viet-bike-scout.vercel.app",
    siteName: "Viet Bike Price Scout",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Viet Bike Price Scout",
    description: "Compare motorbike rental prices across Vietnam in seconds. Powered by TinyFish Mino parallel browser agents.",
  },
  metadataBase: new URL("https://viet-bike-scout.vercel.app"),
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

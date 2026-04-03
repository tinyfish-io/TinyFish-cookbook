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
  title: "Saigon Happy Hour Sniper",
  description: "Find the best drink deals in Ho Chi Minh City — powered by TinyFish parallel browser agents.",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "Saigon Happy Hour Sniper",
    description: "Find the best drink deals in Ho Chi Minh City. Searches bars and restaurants across Districts 1, 3, 5 & 7 simultaneously.",
    url: "https://saigon-happy-hour-sniper.vercel.app",
    siteName: "Saigon Happy Hour Sniper",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Saigon Happy Hour Sniper",
    description: "Find the best drink deals in Ho Chi Minh City. Powered by TinyFish parallel browser agents.",
  },
  metadataBase: new URL("https://saigon-happy-hour-sniper.vercel.app"),
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

import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "HDB Deal Sniper | Find Underpriced Resale Flats",
  description: "AI-powered real-time HDB resale deal finder for Singapore",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${plusJakarta.variable} ${jetbrainsMono.variable} ${sourceSerif.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

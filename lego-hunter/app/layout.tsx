import type { Metadata } from "next";
import { Nunito, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Lego Restock Hunter | Find In-Stock Lego Sets",
  description: "Search 15 toy retailers simultaneously to find sold-out Lego sets that have been restocked. Never miss a Lego restock again!",
  keywords: ["lego", "restock", "toys", "finder", "in stock", "sold out"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${nunito.variable} ${plusJakarta.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}

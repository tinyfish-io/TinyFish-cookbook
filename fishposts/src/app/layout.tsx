import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FishPosts.exe — Paste your URL. Get memed.",
  description:
    "AI reads your website and makes a meme so specific, so accurate, it hurts. Powered by TinyFish Web Agent.",
  openGraph: {
    title: "FishPosts.exe — Paste your URL. Get memed.",
    description:
      "AI reads your website and makes a meme so specific, so accurate, it hurts.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

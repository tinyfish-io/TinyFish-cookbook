import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentReady - Is Your Store Ready for AI Shopping Agents?",
  description:
    "The first behavioral testing tool for agentic commerce. Deploy real AI agents that try to shop your store and find out where they fail.",
  openGraph: {
    title: "AgentReady - Is Your Store Ready for AI Shopping Agents?",
    description:
      "Deploy 5 real AI agents that simulate shopping your store and report exactly where they fail. Get a 0-100 Agent Readiness Score.",
    siteName: "AgentReady",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AgentReady - Is Your Store Ready for AI Shopping Agents?",
    description:
      "Deploy 5 real AI agents that simulate shopping your store and report exactly where they fail. Get a 0-100 Agent Readiness Score.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}

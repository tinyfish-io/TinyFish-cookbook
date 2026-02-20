import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
    title: "Inventory Guardian | AI Stock Monitor",
    description: "AI-driven inventory risk and integrity agent",
};

export default function RootLayout({ children }) {
    return (
        <html lang="en" className="dark">
            <body className={`${inter.className} bg-background text-foreground antialiased`}>
                {children}
            </body>
        </html>
    );
}

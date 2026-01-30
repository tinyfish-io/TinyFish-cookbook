"use client";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function AgentHeader({ status }) {
    return (
        <header className="border-b border-primary/20 bg-background/80 backdrop-blur-md sticky top-0 z-50">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20">
                            <Image src="/logo.png" alt="Logo" width={24} height={24} className="brightness-110" />
                        </div>
                        <div className={cn(
                            "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background",
                            status === "active" ? "bg-success" : "bg-warning"
                        )} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="font-bold text-lg tracking-tight">
                                TinyFish <span className="text-primary italic">Logistics</span>
                            </h1>
                        </div>
                    </div>
                </div>

                <nav className="hidden lg:flex items-center gap-6">
                    <Link href="/" className="text-xs font-bold uppercase tracking-widest text-primary transition-colors hover:opacity-80">
                        Supply Chain Risk
                    </Link>
                </nav>
            </div>
        </header>
    );
}

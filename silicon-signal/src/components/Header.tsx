import Link from 'next/link';
import { CheckSquare } from 'lucide-react';

export default function Header() {
    return (
        <header className="fixed top-0 left-0 right-0 h-16 border-b border-white/5 bg-background/80 backdrop-blur-md z-50 flex items-center justify-between px-6">
            <Link href="/" className="flex items-center gap-3 cursor-pointer">
                <div className="w-8 h-8 rounded bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center">
                    <CheckSquare className="w-5 h-5 text-accent" />
                </div>
                <span className="font-semibold tracking-tight text-lg">SiliconSignal</span>
            </Link>


            <div className="flex items-center gap-4">
            </div>
        </header>
    );
}

export default function Loading() {
    return (
        <div className="min-h-screen bg-gridiron-bg flex items-center justify-center">
            <div className="text-center">
                <div className="relative">
                    <div className="text-6xl animate-bounce-subtle">🍗</div>
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-12 h-2 bg-gridiron-bg-tertiary rounded-full blur-sm"></div>
                </div>
                <p className="mt-6 font-heading text-xl text-gray-300">
                    Scouting for Wings...
                </p>
                <div className="mt-4 flex justify-center gap-1">
                    <div className="w-2 h-2 bg-wing-green rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-wing-green rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-wing-green rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                </div>
            </div>
        </div>
    );
}

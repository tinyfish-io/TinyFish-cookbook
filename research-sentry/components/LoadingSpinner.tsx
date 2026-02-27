'use client';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
}

export default function LoadingSpinner({ size = 'md' }: LoadingSpinnerProps) {
    const sizeMap = {
        sm: 'w-6 h-6',
        md: 'w-10 h-10',
        lg: 'w-16 h-16',
    };

    return (
        <div className="flex justify-center items-center">
            <div className="relative">
                <div className={`
                    ${sizeMap[size]}
                    border-4 border-emerald-500/20 border-t-emerald-500
                    rounded-full animate-spin
                `} />
                <div className={`
                    absolute inset-0 
                    ${sizeMap[size]}
                    border-4 border-transparent border-b-teal-500/50
                    rounded-full animate-pulse
                `} />
            </div>
        </div>
    );
}

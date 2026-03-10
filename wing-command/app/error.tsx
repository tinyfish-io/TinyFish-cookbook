'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui';

interface ErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('Application error:', error);
    }, [error]);

    return (
        <div className="min-h-screen bg-gridiron-bg flex items-center justify-center p-4">
            <div className="glass rounded-xl p-8 max-w-md w-full text-center">
                <div className="text-6xl mb-4">🏈</div>
                <h2 className="font-heading text-2xl text-gray-100 mb-2">
                    Fumble!
                </h2>
                <p className="text-gray-400 mb-6">
                    Something went wrong while loading Wing Command.
                    Don&apos;t worry, we&apos;re on it!
                </p>
                {error.digest && (
                    <p className="text-xs text-gray-500 mb-4">
                        Error ID: {error.digest}
                    </p>
                )}
                <div className="flex gap-3 justify-center">
                    <Button onClick={reset} variant="primary">
                        Try Again
                    </Button>
                    <Button
                        onClick={() => window.location.href = '/'}
                        variant="secondary"
                    >
                        Go Home
                    </Button>
                </div>
            </div>
        </div>
    );
}

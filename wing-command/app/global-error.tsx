'use client';

interface GlobalErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
    return (
        <html>
            <body style={{
                backgroundColor: '#121212',
                color: '#f3f4f6',
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'system-ui, sans-serif',
                padding: '1rem',
            }}>
                <div style={{
                    background: 'rgba(26, 26, 26, 0.9)',
                    borderRadius: '1rem',
                    padding: '2rem',
                    maxWidth: '28rem',
                    width: '100%',
                    textAlign: 'center',
                    border: '1px solid #333',
                }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏈</div>
                    <h2 style={{
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        marginBottom: '0.5rem',
                    }}>
                        Critical Error
                    </h2>
                    <p style={{
                        color: '#9ca3af',
                        marginBottom: '1.5rem',
                    }}>
                        Wing Command encountered a critical error.
                        Please try refreshing the page.
                    </p>
                    {error.digest && (
                        <p style={{
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            marginBottom: '1rem',
                        }}>
                            Error ID: {error.digest}
                        </p>
                    )}
                    <button
                        onClick={reset}
                        style={{
                            backgroundColor: '#22c55e',
                            color: 'white',
                            border: 'none',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '0.5rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            marginRight: '0.5rem',
                        }}
                    >
                        Try Again
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            backgroundColor: '#333',
                            color: 'white',
                            border: '1px solid #444',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '0.5rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                        }}
                    >
                        Refresh Page
                    </button>
                </div>
            </body>
        </html>
    );
}

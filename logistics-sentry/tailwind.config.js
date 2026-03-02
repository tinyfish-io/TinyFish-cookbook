/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "hsl(45, 30%, 98%)",
                foreground: "hsl(45, 10%, 15%)",
                primary: {
                    DEFAULT: "hsl(48, 96%, 53%)",
                    foreground: "hsl(45, 10%, 15%)",
                },
                success: {
                    DEFAULT: "#10b981",
                    15: "rgba(16, 185, 129, 0.15)",
                    5: "rgba(16, 185, 129, 0.05)",
                    20: "rgba(16, 185, 129, 0.2)",
                },
                warning: {
                    DEFAULT: "#f59e0b",
                    15: "rgba(245, 158, 11, 0.15)",
                    5: "rgba(245, 158, 11, 0.05)",
                    20: "rgba(245, 158, 11, 0.2)",
                },
                destructive: {
                    DEFAULT: "#ef4444",
                    10: "rgba(239, 68, 68, 0.1)",
                },
                info: {
                    DEFAULT: "#3b82f6",
                    10: "rgba(59, 130, 246, 0.1)",
                },
                muted: {
                    DEFAULT: "hsl(45, 10%, 90%)",
                    foreground: "hsl(45, 5%, 40%)",
                },
                accent: {
                    DEFAULT: "hsl(48, 96%, 90%)",
                    foreground: "hsl(45, 10%, 15%)",
                },
                border: "hsl(45, 10%, 88%)",
                ring: "hsl(48, 96%, 53%)",
            },
            backgroundImage: {
                'grid-pattern': "radial-gradient(circle, #d1d1d1 1px, transparent 1px)",
            },
            backgroundSize: {
                'grid-pattern': '24px 24px',
            },
        },
    },
    plugins: [],
};

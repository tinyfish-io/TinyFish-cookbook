import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'awesome.dev — aggregator',
  description: 'Find every awesome resource, unified in one place.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}

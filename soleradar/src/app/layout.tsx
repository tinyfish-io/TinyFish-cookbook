import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SoleRadar — Global Sneaker Intelligence',
  description: 'Find your grail anywhere. AI agents scan 7+ retailers in your region simultaneously.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@300;400;500;600;700&family=Barlow+Condensed:ital,wght@0,400;0,700;0,900;1,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}

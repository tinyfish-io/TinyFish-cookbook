import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ModuleMapper — Real student reviews, every university',
  description: 'Paste any course code and university. Get real student reviews, workload reports, grading patterns, and professor feedback in one place.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}

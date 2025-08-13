import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI Agent - Transform Ideas to Code',
  description: 'AI-powered tool to generate web components with live preview and code',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
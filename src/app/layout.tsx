import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = { title: 'Календарь смен', description: 'Календарь смен, часов, отгулов и заработка.' }
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ru"><body>{children}</body></html> }

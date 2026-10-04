import type { Metadata } from "next"
import { Geist_Mono, Inter } from "next/font/google"

import "./globals.css"
import { SiteHeader } from "@/components/site-header"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: "QueryDesk",
  description: "Cashless claim query workbench for a hospital insurance desk.",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "font-sans antialiased",
        inter.variable,
        geistMono.variable
      )}
    >
      <body className="text-sm">
        <ThemeProvider>
          <SiteHeader />
          <main className="mx-auto max-w-280 px-8 py-8">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  )
}

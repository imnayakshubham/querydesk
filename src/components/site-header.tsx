import Link from "next/link"

const navLinkClass = "text-muted-foreground hover:text-foreground"

export function SiteHeader() {
  return (
    <header className="border-b">
      <nav className="mx-auto flex max-w-280 items-center gap-6 px-8 py-3">
        <Link href="/" className="font-semibold">
          QueryDesk
        </Link>
        <Link href="/" className={navLinkClass}>
          Queue
        </Link>
        <Link href="/rules" className={navLinkClass}>
          Rules
        </Link>
        <Link href="/about" className={navLinkClass}>
          About
        </Link>
        <a
          href={`https://github.com/${process.env.GITHUB_REPO}`}
          className={`ml-auto ${navLinkClass}`}
        >
          Repository on GitHub ↗
        </a>
      </nav>
    </header>
  )
}

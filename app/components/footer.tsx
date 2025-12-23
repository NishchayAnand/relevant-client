import Link from "next/link"

export function Footer() {
  return (
    <footer className="mt-16 border-t border-neutral-200 dark:border-neutral-800">
      <div className="max-w-3xl mx-auto px-0 py-8 flex items-center justify-between text-sm text-neutral-600 dark:text-neutral-400">
        <p>© {new Date().getFullYear()} Relevant</p>
        <nav className="flex gap-4">
          <Link className="hover:text-neutral-800 dark:hover:text-neutral-200" href="/">
            Home
          </Link>
          <Link className="hover:text-neutral-800 dark:hover:text-neutral-200" href="/about">
            About
          </Link>
        </nav>
      </div>
    </footer>
  )
}
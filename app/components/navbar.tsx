import Link from 'next/link';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

const navItems = {
  '/': {
    name: 'Home',
  },
  '/about': {
    name: 'About',
  },
}

export function Navbar() {
  return (
        <nav
          className="lg:px-10 flex justify-between " // flex flex-row items-start relative px-0 pb-0 fade md:overflow-auto scroll-pr-6 md:relative
          id="navbar"
        >
          <Link href="/" className='text-xl font-semibold hover:text-neutral-800 dark:hover:text-neutral-200'>Relevant</Link>
          {/* <div className="flex flex-row space-x-0 pr-10">
            {Object.entries(navItems).map(([path, { name }]) => {
              return (
                <Link
                  key={path}
                  href={path}
                  className="transition-all hover:text-neutral-800 dark:hover:text-neutral-200 flex align-middle relative py-1 px-2 m-1"
                >
                  {name}
                </Link>
              )
            })}
          </div> */}
        </nav>
  )
}
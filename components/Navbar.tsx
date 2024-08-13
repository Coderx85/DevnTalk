import Link from 'next/link'
import React from 'react'
import Image from 'next/image'
import { SignedIn, UserButton } from '@clerk/nextjs'
import MobileNav from './MobileNav'

const Navbar = () => {
  return (
    <nav className="flex justify-between fixed z-50 w-full bg-dark-1 px-6 py-4 lg:px-10">
      <Link href="/" className="flex items-center gap-1">
        {/* <Image
          src="/icons/logo.svg"
          width={32}
          height={32}
          alt="yoom logo"
          className="max-sm:size-10"
        /> */}
        <p className="text-[26px] font-extrabold text-white max-sm:hidden duration-75">
          Dev<span className='text-primary'>Talk</span>
        </p>
      </Link>
      <div className="flex gap-5">
        <SignedIn>
          <UserButton afterSignOutUrl="/sign-in" />
        </SignedIn>

        <MobileNav />
      </div>
    </nav>
  )
}

export default Navbar
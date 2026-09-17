"use client";

import Image from "next/image";
import Link from "next/link";

export function Header(_props: { dayIndex?: number } = {}) {
  return (
    <header
      className="sticky top-0 z-20 bg-navy text-white"
      style={{ viewTransitionName: "site-header" }}
    >
      <div className="banner-pad">
        <div className="mx-auto flex w-full max-w-[1100px] items-center justify-center px-4 py-3 md:px-8">
          <Link href="/" aria-label="Shadow Dragon Arcade" className="brand-mark">
            <Image
              src="/brand/dragon-mark.png"
              alt="ShadowDragon"
              width={192}
              height={110}
              className="h-10 w-auto"
              priority
            />
          </Link>
        </div>
      </div>
    </header>
  );
}

import Image from "next/image";
import Link from "next/link";
import { Envelope, XLogo } from "@phosphor-icons/react/dist/ssr";

export function HomeFooter() {
  return (
    <footer className="border-t border-[var(--color-neutral-300)] bg-white px-4">
      <div className="flex flex-col items-end justify-end max-w-6xl mx-auto">
        <div className="inline-flex h-16 w-16 my-5 items-center justify-center rounded-full bg-white/15 ">
          <Image
            src="/logo.png"
            alt="Wikin logo"
            width={100}
            height={100}
            priority
            className="rounded-full object-contain"
          />
        </div>
        <div className="flex gap-5">
          <h3 className="mb-2! text-sm font-semibold cursor-pointer hover:text-[var(--color-primary)]">
            TOEFL
          </h3>
          <h3 className="mb-2! text-sm font-semibold cursor-pointer hover:text-[var(--color-primary)]">
            IELTS
          </h3>
          <h3 className="mb-2! text-sm font-semibold cursor-pointer hover:text-[var(--color-primary)]">
            Pricing
          </h3>
        </div>
        <div className="flex gap-5">
          <Link
            href="https://x.com/wikin"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="X (Twitter)"
            className="mb-2! inline-flex h-9 w-9 items-center justify-center text-[var(--color-neutral-900)] hover:text-[var(--color-primary)]"
          >
            <XLogo size={18} weight="fill" aria-hidden="true" />
          </Link>
          <a
            href="mailto:support@wikin.com"
            aria-label="Email support"
            className="mb-2! inline-flex h-9 w-9 items-center justify-center text-[var(--color-neutral-900)] hover:text-[var(--color-primary)]"
          >
            <Envelope size={18} weight="regular" aria-hidden="true" />
          </a>
        </div>
      </div>
      <div className="px-4 py-2 text-center text-xs text-[var(--color-neutral-500)] md:px-7">
        © {new Date().getFullYear()} Wikin. All rights reserved.
      </div>
    </footer>
  );
}

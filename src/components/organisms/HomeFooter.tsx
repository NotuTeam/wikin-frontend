import Link from "next/link";

export function HomeFooter() {
  return (
    <footer className="border-t border-[var(--color-neutral-300)] bg-white">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 md:grid-cols-4 md:px-7">
        <div className="md:col-span-2">
          <div className="mb-2 text-2xl font-bold text-[var(--color-primary)]">wikin</div>
          <p className="max-w-md text-sm leading-6 text-[var(--color-neutral-700)]">
            AI-powered IELTS and TOEFL simulation platform to help you practice
            effectively and improve your test performance.
          </p>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-[var(--color-neutral-900)]">Product</h3>
          <div className="space-y-1.5 text-sm text-[var(--color-neutral-700)]">
            <Link href="/simulation" className="block hover:text-[var(--color-primary)]">Simulation</Link>
            <Link href="/result" className="block hover:text-[var(--color-primary)]">Result Review</Link>
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-[var(--color-neutral-900)]">Support</h3>
          <div className="space-y-1.5 text-sm text-[var(--color-neutral-700)]">
            <a href="#" className="block hover:text-[var(--color-primary)]">Help Center</a>
            <a href="#" className="block hover:text-[var(--color-primary)]">Contact</a>
          </div>
        </div>
      </div>
      <div className="border-t border-[var(--color-neutral-300)] px-4 py-4 text-center text-xs text-[var(--color-neutral-500)] md:px-7">
        © {new Date().getFullYear()} Wikin. All rights reserved.
      </div>
    </footer>
  );
}

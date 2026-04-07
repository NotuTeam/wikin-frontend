import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[var(--color-neutral-50)] px-4 py-10 md:px-7">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-[var(--color-neutral-300)] bg-white shadow-sm md:grid-cols-2">
        <section className="hidden p-8 text-white md:block" style={{ background: "var(--gradient-banner)" }}>
          <p className="text-xs uppercase tracking-[0.14em] text-white/75">Welcome to Wikin</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight">Practice smarter for IELTS & TOEFL.</h1>
          <p className="mt-3 text-sm text-white/85">
            Continue your simulation journey and track your progress in one place.
          </p>
        </section>

        <section className="p-8">
          <h2 className="text-2xl font-bold text-[var(--color-neutral-900)]">Login</h2>
          <p className="mt-1 text-sm text-[var(--color-neutral-500)]">Access your dashboard and continue your session.</p>

          <form className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-neutral-700)]">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                className="w-full rounded-[10px] border border-[var(--color-neutral-300)] bg-[var(--color-neutral-100)] px-4 py-3 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-neutral-700)]">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full rounded-[10px] border border-[var(--color-neutral-300)] bg-[var(--color-neutral-100)] px-4 py-3 text-sm"
              />
            </div>

            <button
              type="button"
              className="w-full rounded-[10px] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(93,63,211,0.35)]"
            >
              Login
            </button>
          </form>

          <p className="mt-4 text-sm text-[var(--color-neutral-500)]">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-[var(--color-primary)]">
              Register
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}

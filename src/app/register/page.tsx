import Link from "next/link";

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-[var(--color-neutral-50)] px-4 py-10 md:px-7">
      <div className="mx-auto w-full max-w-2xl rounded-3xl border border-[var(--color-neutral-300)] bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-[var(--color-neutral-900)]">Create your account</h1>
        <p className="mt-1 text-sm text-[var(--color-neutral-500)]">
          Start your IELTS & TOEFL simulation journey with Wikin.
        </p>

        <form className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-neutral-700)]">First name</label>
            <input
              placeholder="John"
              className="w-full rounded-[10px] border border-[var(--color-neutral-300)] bg-[var(--color-neutral-100)] px-4 py-3 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-neutral-700)]">Last name</label>
            <input
              placeholder="Doe"
              className="w-full rounded-[10px] border border-[var(--color-neutral-300)] bg-[var(--color-neutral-100)] px-4 py-3 text-sm"
            />
          </div>

          <div className="md:col-span-2">
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
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-neutral-700)]">Confirm password</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full rounded-[10px] border border-[var(--color-neutral-300)] bg-[var(--color-neutral-100)] px-4 py-3 text-sm"
            />
          </div>

          <button
            type="button"
            className="md:col-span-2 mt-1 w-full rounded-[10px] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(93,63,211,0.35)]"
          >
            Create Account
          </button>
        </form>

        <p className="mt-4 text-sm text-[var(--color-neutral-500)]">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-[var(--color-primary)]">
            Login
          </Link>
        </p>
      </div>
    </main>
  );
}

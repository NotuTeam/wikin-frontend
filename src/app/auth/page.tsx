import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { API_URL } from "@/lib";
import { AuthPageGuard } from "@/components/AuthPageGuard";

type AuthPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const headerStore = await headers();
  const cookie = headerStore.get("cookie") ?? "";

  if (cookie) {
    try {
      const sessionRes = await fetch(`${API_URL}/api/auth/session`, {
        headers: { cookie },
        cache: "no-store",
      });

      if (sessionRes.ok) {
        const sessionJson = (await sessionRes.json()) as {
          success: boolean;
          data?: { user?: { sub?: string } };
        };

        if (sessionJson.success && sessionJson.data?.user?.sub) {
          redirect("/dashboard");
        }
      }
    } catch {
      // ignore session check errors on auth page
    }
  }

  const params = searchParams ? await searchParams : undefined;
  const hasLoginError = params?.error === "login_failed";

  return (
    <main className="min-h-screen bg-[var(--color-neutral-50)] px-4 py-10 md:px-7 flex items-center justify-center">
      <AuthPageGuard />
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-3xl border border-[var(--color-neutral-300)] bg-white shadow-sm md:grid-cols-2 min-h-[50dvh]">
        <section
          className="hidden p-8 text-white md:flex flex-col justify-center gap-5"
          style={{ background: "var(--gradient-banner)" }}
        >
          <p className="text-xs uppercase tracking-[0.14em] text-white/75">
            Welcome to Wikin
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-white!">
            One click to start your IELTS & TOEFL journey.
          </h1>
          <p className="mt-3 text-sm text-white/85">
            Sign in with your Google account to continue simulation sessions,
            track results, and access your dashboard.
          </p>
        </section>

        <section className="p-8 flex flex-col justify-center gap-5 items-center">
          <h2 className="text-2xl font-bold text-[var(--color-neutral-900)]">
            Sign in
          </h2>
          <p className="text-sm text-[var(--color-neutral-500)]">
            Use your prevered signin method that we serve below.
          </p>

          {hasLoginError && (
            <div className="mt-4 rounded-[10px] border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              Login gagal. Silakan coba lagi.
            </div>
          )}

          <a
            href={`${API_URL}/api/auth/google/login`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(93,63,211,0.35)]"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-[var(--color-primary)]">
              G
            </span>
            Continue with Google
          </a>
        </section>
      </div>
    </main>
  );
}

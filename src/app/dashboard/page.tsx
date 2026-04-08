"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib";
import { AuthGuard } from "@/components/AuthGuard";

const testItems = [
  {
    title: "TOEFL Reading Practice Set 01",
    description:
      "Sharpen inference and vocabulary skills with timed TOEFL-style reading questions.",
    progress: 83,
    attended: "50 of 60",
    updated: "2 days ago",
    newQuestions: true,
  },
  {
    title: "IELTS Listening Mock Session",
    description:
      "Train active listening and note-taking with multi-part IELTS listening sections.",
    progress: 62,
    attended: "31 of 50",
    updated: "5 days ago",
    newQuestions: false,
  },
  {
    title: "IELTS Writing Task Booster",
    description:
      "Practice coherent essay structure and improve lexical resource using feedback loops.",
    progress: 40,
    attended: "8 of 20",
    updated: "9 days ago",
    newQuestions: true,
  },
];

const stats = [
  { label: "Last Band Score", value: "7.0", delta: "↑ +0.5 this week" },
  { label: "Completed Sessions", value: "18", delta: "↑ +4 this month" },
  { label: "Average Accuracy", value: "84%", delta: "↑ +3% trend" },
  { label: "Study Time", value: "6h 20m", delta: "↑ +1h 10m" },
];

function DashboardContent({ user }: { user: { name: string; picture?: string } }) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      router.replace("/auth");
    }
  };

  return (
    <main className="min-h-screen bg-[var(--color-neutral-50)]">
      <aside className="fixed left-0 top-0 flex h-screen w-[60px] flex-col items-center border-r border-[var(--color-neutral-300)] bg-white py-5">
        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--color-primary-pale)] text-lg font-bold text-[var(--color-primary)]">
          W
        </div>
        <div className="mb-3 h-px w-10 bg-[var(--color-neutral-100)]" />
        <nav className="flex flex-col items-center gap-2">
          {[
            { label: "Home", icon: "⌂" },
            { label: "Tests", icon: "▦" },
            { label: "Results", icon: "◔" },
            { label: "Profile", icon: "☺" },
          ].map((item, idx) => (
            <button
              key={item.label}
              className={`flex h-11 w-11 items-center justify-center rounded-[10px] text-sm ${
                idx === 1
                  ? "bg-[var(--color-primary-pale)] text-[var(--color-primary)]"
                  : "text-[var(--color-neutral-500)] hover:bg-[var(--color-neutral-100)]"
              }`}
              aria-label={item.label}
            >
              {item.icon}
            </button>
          ))}
        </nav>
        <div className="mt-auto flex flex-col items-center gap-2">
          <button
            onClick={handleLogout}
            className="flex h-11 w-11 items-center justify-center rounded-[10px] text-[var(--color-neutral-500)] hover:bg-[var(--color-neutral-100)]"
            aria-label="Logout"
          >
            ⎋
          </button>
          <Link
            href="/"
            className="flex h-11 w-11 items-center justify-center rounded-[10px] text-[var(--color-neutral-500)] hover:bg-[var(--color-neutral-100)]"
            aria-label="Back to landing"
          >
            ↩
          </Link>
        </div>
      </aside>

      <div className="ml-[60px] min-h-screen">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-[var(--color-neutral-300)] bg-white px-7">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-neutral-500)]">⌕</span>
            <input
              placeholder="Search your test"
              className="h-9 w-[280px] rounded-full border border-[var(--color-neutral-300)] bg-[var(--color-neutral-100)] pl-8 pr-4 text-sm"
            />
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-[var(--color-neutral-500)]">🔔</span>
            <div className="h-5 w-px bg-[var(--color-neutral-300)]" />
            {user.picture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.picture} alt={user.name} className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-[var(--color-primary-pale)]" />
            )}
            <span className="font-medium text-[var(--color-neutral-700)]">{user.name}</span>
          </div>
        </header>

        <section className="p-7">
          <div className="mb-7 rounded-[24px] px-6 py-6 text-white" style={{ background: "var(--gradient-banner)" }}>
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/70">Wikin Academy</p>
            <h1 className="mt-1 text-2xl font-bold">Welcome back, {user.name}</h1>
            <p className="mt-1 text-sm text-white/80">Continue your preparation and keep your streak alive.</p>
          </div>

          <div className="mb-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {stats.map((item) => (
              <div key={item.label} className="rounded-2xl border border-[var(--color-neutral-300)] bg-white p-5 shadow-sm">
                <p className="text-xs text-[var(--color-neutral-500)]">{item.label}</p>
                <p className="mt-1 text-2xl font-bold text-[var(--color-neutral-900)]" style={{ fontFamily: '"JetBrains Mono", "Fira Code", monospace' }}>
                  {item.value}
                </p>
                <p className="mt-1 text-xs text-[var(--color-accent-dark)]">{item.delta}</p>
              </div>
            ))}
          </div>

          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[32px] font-bold text-[var(--color-neutral-900)]">My Tests</h2>
            <a className="text-sm font-medium text-[var(--color-primary)]" href="#">
              View All
            </a>
          </div>

          <div className="space-y-3">
            {testItems.map((item) => (
              <div key={item.title} className="flex flex-col gap-4 rounded-2xl border border-[var(--color-neutral-300)] bg-white px-6 py-5 md:flex-row md:items-center md:justify-between">
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-base font-semibold text-[var(--color-primary)]">{item.title}</h3>
                    {item.newQuestions && (
                      <span className="rounded-md bg-[var(--color-accent-pale)] px-2 py-0.5 text-xs font-medium text-[var(--color-accent-dark)]">
                        New Questions
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--color-neutral-500)]">{item.description}</p>
                </div>

                <div className="flex items-center gap-8">
                  <div>
                    <p className="mb-1 text-xs text-[var(--color-neutral-500)]">Question paper: Attended</p>
                    <div className="h-2 w-[120px] rounded-full bg-[var(--color-neutral-100)]">
                      <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${item.progress}%` }} />
                    </div>
                    <p className="mt-1 text-xs font-medium text-[var(--color-neutral-700)]">{item.attended}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[var(--color-neutral-500)]">Last Updated</p>
                    <p className="text-xs font-medium text-[var(--color-neutral-700)]">{item.updated}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return <AuthGuard>{(user) => <DashboardContent user={user} />}</AuthGuard>;
}

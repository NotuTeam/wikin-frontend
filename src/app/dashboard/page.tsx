"use client";

import { useDashboardUser } from "@/components/organisms/DashboardShell";

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

export default function DashboardPage() {
  const user = useDashboardUser();

  return (
    <>
          <div
            className="mb-7 rounded-[24px] px-6 py-6 text-white"
            style={{ background: "var(--gradient-banner)" }}
          >
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/70">
              Wikin Academy
            </p>
            <h1 className="mt-1 text-2xl font-bold">
              Welcome back, {user.name}
            </h1>
            <p className="mt-1 text-sm text-white/80">
              Continue your preparation and keep your streak alive.
            </p>
          </div>

          <div className="mb-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {stats.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-[var(--color-neutral-300)] bg-white p-5 shadow-sm"
              >
                <p className="text-xs text-[var(--color-neutral-500)]">
                  {item.label}
                </p>
                <p
                  className="mt-1 text-2xl font-bold text-[var(--color-neutral-900)]"
                  style={{
                    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                  }}
                >
                  {item.value}
                </p>
                <p className="mt-1 text-xs text-[var(--color-accent-dark)]">
                  {item.delta}
                </p>
              </div>
            ))}
          </div>

          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[32px] font-bold text-[var(--color-neutral-900)]">
              My Tests
            </h2>
            <a
              className="text-sm font-medium text-[var(--color-primary)]"
              href="#"
            >
              View All
            </a>
          </div>

          <div className="space-y-3">
            {testItems.map((item) => (
              <div
                key={item.title}
                className="flex flex-col gap-4 rounded-2xl border border-[var(--color-neutral-300)] bg-white px-6 py-5 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="text-base font-semibold text-[var(--color-primary)]">
                      {item.title}
                    </h3>
                    {item.newQuestions && (
                      <span className="rounded-md bg-[var(--color-accent-pale)] px-2 py-0.5 text-xs font-medium text-[var(--color-accent-dark)]">
                        New Questions
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--color-neutral-500)]">
                    {item.description}
                  </p>
                </div>

                <div className="flex items-center gap-8">
                  <div>
                    <p className="mb-1 text-xs text-[var(--color-neutral-500)]">
                      Question paper: Attended
                    </p>
                    <div className="h-2 w-[120px] rounded-full bg-[var(--color-neutral-100)]">
                      <div
                        className="h-full rounded-full bg-[var(--color-accent)]"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs font-medium text-[var(--color-neutral-700)]">
                      {item.attended}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[var(--color-neutral-500)]">
                      Last Updated
                    </p>
                    <p className="text-xs font-medium text-[var(--color-neutral-700)]">
                      {item.updated}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
    </>
  );
}

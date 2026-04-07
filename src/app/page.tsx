import Link from "next/link";

const features = [
  {
    title: "Adaptive Simulation",
    description:
      "Practice with IELTS and TOEFL-style sections generated dynamically based on your selected difficulty.",
  },
  {
    title: "Section-by-Section Tracking",
    description:
      "Monitor completion progress per section, keep focus, and continue exactly where you left off.",
  },
  {
    title: "Detailed Result Review",
    description:
      "Get score breakdown, answer correctness, and explanation-based feedback for each question.",
  },
];

const steps = [
  "Choose exam type and difficulty",
  "Complete listening, reading, and writing sections",
  "Review results and improve weak areas",
];

const stats = [
  { label: "Simulation Sets", value: "500+" },
  { label: "Practice Questions", value: "20K+" },
  { label: "Avg. Completion", value: "87%" },
  { label: "Active Learners", value: "3K+" },
];

const faqs = [
  {
    q: "Is this platform suitable for both IELTS and TOEFL?",
    a: "Yes. You can switch exam type before starting a session and practice with section structures that follow each test format.",
  },
  {
    q: "Will my session progress be saved automatically?",
    a: "Yes. Your ongoing simulation session is stored locally so you can continue within the active recovery window.",
  },
  {
    q: "Can I review answers after finishing a simulation?",
    a: "Absolutely. The result page includes section breakdown, your answers, correct answers for auto-graded items, and explanations.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--color-neutral-50)]">
      <header className="border-b border-[var(--color-neutral-300)] bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 md:px-7">
          <div className="text-2xl font-bold text-[var(--color-primary)]">wikin</div>
          <div className="flex items-center gap-2">
            <Link
              href="/result"
              className="rounded-[10px] border border-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary-pale)]"
            >
              View Result
            </Link>
            <Link
              href="/simulation"
              className="rounded-[10px] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(93,63,211,0.35)] hover:bg-[var(--color-primary-dark)]"
            >
              Start Simulation
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 md:grid-cols-2 md:px-7 md:py-16">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
            Test Smarter. Score Higher.
          </p>
          <h1 className="mb-4 text-[40px] font-bold leading-tight text-[var(--color-neutral-900)] md:text-[52px]">
            AI-Powered IELTS & TOEFL Practice Platform
          </h1>
          <p className="mb-6 max-w-xl text-base leading-7 text-[var(--color-neutral-700)]">
            Build confidence with structured simulations, realistic questions,
            and actionable feedback designed for learners and professionals.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/simulation"
              className="rounded-[10px] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(93,63,211,0.35)] hover:bg-[var(--color-primary-dark)]"
            >
              Start Free Simulation
            </Link>
            <Link
              href="/result"
              className="rounded-[10px] border border-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary-pale)]"
            >
              See Result Demo
            </Link>
          </div>
        </div>

        <div className="rounded-3xl p-[2px]" style={{ background: "var(--gradient-banner)" }}>
          <div className="rounded-[22px] bg-white p-6">
            <h2 className="mb-4 text-xl font-semibold text-[var(--color-neutral-900)]">
              What You Get
            </h2>
            <div className="space-y-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-[var(--color-neutral-300)] bg-[var(--color-neutral-50)] p-4"
                >
                  <h3 className="mb-1 text-base font-semibold text-[var(--color-neutral-900)]">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-6 text-[var(--color-neutral-700)]">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-6 md:px-7 md:pb-8">
        <div className="grid gap-3 rounded-3xl border border-[var(--color-neutral-300)] bg-white p-6 md:grid-cols-4 md:p-8">
          {stats.map((item) => (
            <div key={item.label} className="rounded-2xl bg-[var(--color-neutral-50)] p-4 text-center">
              <p
                className="text-3xl font-bold text-[var(--color-primary)]"
                style={{ fontFamily: '"JetBrains Mono", "Fira Code", monospace' }}
              >
                {item.value}
              </p>
              <p className="mt-1 text-xs font-medium text-[var(--color-neutral-500)]">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-6 md:px-7 md:pb-8">
        <div className="rounded-3xl border border-[var(--color-neutral-300)] bg-white p-6 md:p-8">
          <h2 className="mb-5 text-2xl font-semibold text-[var(--color-neutral-900)]">How It Works</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {steps.map((step, idx) => (
              <div
                key={step}
                className="rounded-2xl border border-[var(--color-neutral-300)] bg-[var(--color-neutral-50)] p-4"
              >
                <p
                  className="mb-2 text-2xl font-bold text-[var(--color-primary)]"
                  style={{ fontFamily: '"JetBrains Mono", "Fira Code", monospace' }}
                >
                  {idx + 1}
                </p>
                <p className="text-sm leading-6 text-[var(--color-neutral-700)]">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-6 md:px-7 md:pb-8">
        <div className="rounded-3xl border border-[var(--color-neutral-300)] bg-white p-6 md:p-8">
          <h2 className="mb-5 text-2xl font-semibold text-[var(--color-neutral-900)]">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <div key={faq.q} className="rounded-2xl border border-[var(--color-neutral-300)] bg-[var(--color-neutral-50)] p-4">
                <h3 className="mb-1 text-sm font-semibold text-[var(--color-neutral-900)]">{faq.q}</h3>
                <p className="text-sm leading-6 text-[var(--color-neutral-700)]">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-8 md:px-7 md:pb-10">
        <div className="rounded-3xl px-6 py-8 text-center text-white" style={{ background: "var(--gradient-banner)" }}>
          <h2 className="mb-2 text-2xl font-bold">Ready to boost your score?</h2>
          <p className="mx-auto mb-5 max-w-2xl text-sm text-white/85">
            Start your full simulation now and get instant insight into your strengths and improvement areas.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/simulation"
              className="rounded-[10px] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--color-primary)]"
            >
              Start Simulation
            </Link>
            <Link
              href="/result"
              className="rounded-[10px] border border-white/70 px-5 py-2.5 text-sm font-semibold text-white"
            >
              View Result Page
            </Link>
          </div>
        </div>
      </section>

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
    </main>
  );
}

import Link from "next/link";
import Image from "next/image";

import { HomeFooter, HomeNavbar } from "@/components";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    title: "Adaptive Simulation",
    description:
      "AI dynamically adjusts question difficulty and flow based on your latest performance.",
  },
  {
    title: "Detailed Feedback",
    description:
      "Get answer-level evaluation, strengths/weaknesses insights, and clear improvement suggestions.",
  },
  {
    title: "Progress Tracking",
    description:
      "Monitor section-by-section progress and band score trends with measurable clarity.",
  },
  {
    title: "IELTS + TOEFL Ready",
    description: "Prepare for academic and professional goals in one platform.",
  },
];

const steps = [
  "Sign in and choose your target test (IELTS / TOEFL)",
  "Complete adaptive simulations based on your current level",
  "Review results, insights, and your next learning actions",
];

const stats = [
  { label: "Active Learners", value: "3K+" },
  { label: "Simulation Sessions", value: "15K+" },
  { label: "Practice Questions", value: "20K+" },
  { label: "Avg. Completion", value: "87%" },
];

const painPoints = [
  "Not sure where to start your prep journey",
  "Inconsistent and unstructured practice",
  "Hard to measure score progress objectively",
  "Unclear which weak areas to prioritize first",
];

const demoInsights = [
  { label: "Estimated Band", value: "7.0" },
  { label: "Strongest Section", value: "Reading" },
  { label: "Priority Fix", value: "Writing coherence" },
  { label: "Next Action", value: "2 targeted drills" },
];

const testimonials = [
  {
    quote:
      "The writing feedback is super specific. I finally understood my repeated mistakes and improved my band score in three weeks.",
    name: "Nadia",
    role: "Final-year student",
  },
  {
    quote:
      "As a full-time professional, I need efficient prep. The progress tracking keeps my learning consistent.",
    name: "Rizky",
    role: "Marketing professional",
  },
  {
    quote:
      "The simulations feel realistic and made me more confident for the real test. I also love having IELTS and TOEFL in one place.",
    name: "Clara",
    role: "Scholarship applicant",
  },
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
  {
    q: "Do I need to pay to start practicing?",
    a: "No. You can start with the basic flow first, then continue with advanced preparation as needed.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--color-neutral-50)] pt-16">
      <HomeNavbar />

      <section className="mx-auto w-full max-w-[1280px] px-6 py-24 md:px-12 lg:px-16">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="mb-4 inline-flex rounded-full bg-[var(--color-primary-pale)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
              IELTS & TOEFL Prep for Students and Professionals
            </p>
            <h1 className="mb-5 max-w-2xl text-4xl font-bold leading-tight text-[var(--color-neutral-900)] md:text-5xl">
              Adaptive practice, detailed feedback, and progress tracking in one
              platform
            </h1>
            <p className="mb-8 max-w-xl text-lg leading-8 text-[var(--color-neutral-700)]">
              Wikin helps you prepare with AI-powered simulations, actionable
              performance insights, and flexible IELTS/TOEFL pathways tailored
              to your goals.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/auth"
                className={buttonVariants({ variant: "default" })}
              >
                Start Session
              </Link>
            </div>
          </div>

          <Card className="overflow-hidden border-[var(--color-primary-light)] shadow-lg">
            <div className="bg-[var(--gradient-banner)] p-6 text-white">
              <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-white/15">
                <Image
                  src="/logo.png"
                  alt="Wikin logo"
                  width={56}
                  height={56}
                  priority
                  className="rounded-full object-contain"
                />
              </div>
              <p className="text-sm text-white/90">Live Performance Snapshot</p>
              <p className="mt-1 text-2xl font-bold">Skor 8.5 IELTS</p>
            </div>
            <CardContent className="grid gap-3 p-5 sm:grid-cols-2">
              {stats.slice(0, 4).map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-[var(--color-neutral-300)] bg-[var(--color-neutral-50)] p-4"
                >
                  <p
                    className="text-2xl font-bold text-[var(--color-primary)]"
                    style={{
                      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                    }}
                  >
                    {item.value}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-neutral-500)]">
                    {item.label}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="border-y border-[var(--color-neutral-300)] bg-white py-10">
        <div className="mx-auto w-full max-w-[1280px] px-6 md:px-12 lg:px-16">
          <div className="grid gap-4 md:grid-cols-4">
            {stats.map((item) => (
              <div key={item.label} className="text-center">
                <p
                  className="text-3xl font-bold text-[var(--color-primary)]"
                  style={{
                    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                  }}
                >
                  {item.value}
                </p>
                <p className="mt-1 text-sm text-[var(--color-neutral-500)]">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1280px] px-6 py-20 md:px-12 lg:px-16">
        <Card className="border-[var(--color-neutral-300)]">
          <CardHeader>
            <CardTitle className="text-center">
              Problems We Help You Solve
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {painPoints.map((item) => (
                <Card
                  key={item}
                  className="rounded-2xl bg-[var(--color-neutral-50)] p-5 transition-transform hover:-translate-y-0.5 hover:border-[var(--color-primary-light)]"
                >
                  <CardDescription className="text-base">
                    • {item}
                  </CardDescription>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto w-full max-w-[1280px] px-6 pb-20 md:px-12 lg:px-16">
        <Card className="border-[var(--color-neutral-300)]">
          <CardHeader className="pb-4">
            <CardTitle className="text-center">What You Get</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <Card
                  key={feature.title}
                  className="rounded-2xl bg-[var(--color-neutral-50)] transition-transform hover:-translate-y-0.5 hover:border-[var(--color-primary-light)]"
                >
                  <CardHeader className="p-5 pb-2">
                    <CardTitle className="text-base">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 pt-0">
                    <CardDescription>{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto w-full max-w-[1280px] px-6 pb-20 md:px-12 lg:px-16">
        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
            <CardDescription>
              Start your first focused practice in under 2 minutes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              {steps.map((step, idx) => (
                <div key={step} className="relative">
                  {idx < steps.length - 1 && (
                    <span className="absolute left-[46px] top-5 hidden h-px w-[calc(100%-64px)] border-t border-dashed border-[var(--color-neutral-300)] md:block" />
                  )}
                  <Card className="rounded-2xl bg-[var(--color-neutral-50)] p-5">
                    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--gradient-banner)] text-sm font-bold text-white">
                      {idx + 1}
                    </div>
                    <CardDescription className="text-sm">
                      {step}
                    </CardDescription>
                  </Card>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto w-full max-w-[1280px] px-6 pb-20 md:px-12 lg:px-16">
        <Card>
          <CardHeader>
            <CardTitle>Sample Simulation Insights</CardTitle>
            <CardDescription>
              After one session, you immediately see where you stand and what to
              improve next.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              {demoInsights.map((item) => (
                <Card
                  key={item.label}
                  className="rounded-2xl bg-[var(--color-neutral-50)] p-5 text-center"
                >
                  <CardDescription className="text-xs text-[var(--color-neutral-500)]">
                    {item.label}
                  </CardDescription>
                  <p className="mt-1 text-base font-semibold text-[var(--color-neutral-900)]">
                    {item.value}
                  </p>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto w-full max-w-[1280px] px-6 pb-20 md:px-12 lg:px-16">
        <Card className="bg-[var(--color-neutral-50)]">
          <CardHeader>
            <CardTitle>Learner Testimonials</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {testimonials.map((item) => (
                <Card
                  key={item.name}
                  className="rounded-2xl bg-white p-5 transition-colors hover:border-[var(--color-primary-light)]"
                >
                  <CardDescription className="mb-3 italic">
                    “{item.quote}”
                  </CardDescription>
                  <p className="text-sm font-semibold text-[var(--color-neutral-900)]">
                    {item.name}
                  </p>
                  <p className="text-xs text-[var(--color-neutral-500)]">
                    {item.role}
                  </p>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto w-full max-w-[820px] px-6 pb-20 md:px-12">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {faqs.map((faq) => (
              <Card
                key={faq.q}
                className="rounded-2xl bg-[var(--color-neutral-50)] p-5"
              >
                <p className="mb-1 text-sm font-semibold text-[var(--color-neutral-900)]">
                  {faq.q}
                </p>
                <CardDescription>{faq.a}</CardDescription>
              </Card>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto w-full max-w-[1280px] px-6 pb-20 md:px-12 lg:px-16">
        <div className="rounded-3xl bg-[var(--gradient-banner)] px-6 py-20 text-center text-white">
          <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/15">
            <Image
              src="/logo.png"
              alt="Wikin logo"
              width={56}
              height={56}
              priority
              className="rounded-full object-contain"
            />
          </div>
          <h5 className="mb-8! text-sm font-semibold tracking-[.5em] text-[var(--color-primary)]!">
            WIKIN
          </h5>
          <h2 className="mx-auto! mb-6 max-w-2xl text-4xl font-bold">
            Let's prepare your test with more clarity?
          </h2>
          <div className="flex mt-10 flex-wrap items-center justify-center gap-3">
            <Link
              href="/auth"
              className={buttonVariants({
                variant: "outline",
                className:
                  "border-white/80 text-[var(--color-primary)] hover:bg-[var(--color-primary-pale)]",
              })}
            >
              Start Session
            </Link>
          </div>
        </div>
      </section>

      <HomeFooter />
    </main>
  );
}

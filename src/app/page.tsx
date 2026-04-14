"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import AOS from "aos";
import "aos/dist/aos.css";

import { HomeFooter, HomeNavbar } from "@/components";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Headphones,
  BookOpen,
  PenNib,
  ChatCircleText,
  Check,
  Sparkle,
  Lightning,
  Gauge,
} from "@phosphor-icons/react/dist/ssr";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
} from "chart.js";

import AnimatedWLogo from "@/components/AnimatedLogo";

const trustedBy = [
  { name: "Universitas Indonesia", abbr: "UI" },
  { name: "Institut Teknologi Bandung", abbr: "ITB" },
  { name: "Universitas Gadjah Mada", abbr: "UGM" },
  { name: "BINUS University", abbr: "BINUS" },
];

const features = [
  {
    icon: Headphones,
    title: "Adaptive Listening",
    description:
      "AI dynamically adjusts audio difficulty and question flow based on your comprehension level.",
  },
  {
    icon: BookOpen,
    title: "Smart Reading Analysis",
    description:
      "Get detailed passage breakdowns with vocabulary insights and time management tips.",
  },
  {
    icon: PenNib,
    title: "AI Writing Feedback",
    description:
      "Receive instant scoring and specific suggestions to improve coherence and grammar.",
  },
  // {
  //   icon: ChatCircleText,
  //   title: "Speaking Simulation",
  //   description:
  //     "Practice with realistic prompts and get feedback on fluency and pronunciation.",
  // },
];

const steps = [
  {
    title: "Choose Your Test",
    description: "Select IELTS or TOEFL and set your target band or score.",
  },
  {
    title: "Practice Adaptively",
    description: "Complete AI-powered simulations tailored to your level.",
  },
  {
    title: "Review & Improve",
    description: "Get detailed feedback and focus on your weak areas.",
  },
];

const stats = [
  { label: "Active Learners", value: "3K+" },
  { label: "Simulation Sessions", value: "15K+" },
  { label: "Practice Questions", value: "20K+" },
  { label: "Avg. Score Improvement", value: "+1.5" },
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
    score: "IELTS 7.5",
  },
  {
    quote:
      "As a full-time professional, I need efficient prep. The progress tracking keeps my learning consistent.",
    name: "Rizky",
    role: "Marketing professional",
    score: "TOEFL 105",
  },
  {
    quote:
      "The simulations feel realistic and made me more confident for the real test. I also love having IELTS and TOEFL in one place.",
    name: "Clara",
    role: "Scholarship applicant",
    score: "IELTS 8.0",
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

const missionStats = [
  { value: "15K+", label: "Simulations Completed" },
  { value: "92%", label: "Learners Improved" },
  { value: "4.8/5", label: "Average Rating" },
];

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ChartTitle,
  Tooltip,
  Legend,
);

// Interactive Fill in the Blank Demo Component
function FillInTheBlankDemo() {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const question = {
    textBefore: "The scientist",
    blank: "_____",
    textAfter: "the data carefully before publishing the results.",
    options: [
      { id: "A", text: "analyze", isCorrect: false },
      { id: "B", text: "analyzed", isCorrect: true },
      { id: "C", text: "analyzing", isCorrect: false },
      { id: "D", text: "analyzes", isCorrect: false },
    ],
  };

  const handleSelect = (optionId: string, correct: boolean) => {
    setSelectedAnswer(optionId);
    setIsCorrect(correct);
  };

  const handleReset = () => {
    setSelectedAnswer(null);
    setIsCorrect(null);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-primary)]">
          Fill in the Blank
        </span>
        <span className="rounded-full bg-[var(--color-primary-pale)] px-2 py-1 text-xs font-medium text-[var(--color-primary)]">
          Grammar
        </span>
      </div>

      {/* Question */}
      <p className="text-[15px] leading-7 text-[var(--color-neutral-800)]">
        {question.textBefore}{" "}
        <span
          className={`inline-block min-w-[80px] rounded-md px-2 py-0.5 text-center font-semibold ${
            selectedAnswer === null
              ? "bg-[var(--color-neutral-200)] text-[var(--color-neutral-500)]"
              : isCorrect
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
          }`}
        >
          {selectedAnswer
            ? question.options.find((o) => o.id === selectedAnswer)?.text
            : question.blank}
        </span>{" "}
        {question.textAfter}
      </p>

      {/* Options */}
      <div className="flex flex-col gap-3">
        {question.options.map((option) => {
          const isSelected = selectedAnswer === option.id;
          const showCorrect = isSelected && option.isCorrect;
          const showWrong = isSelected && !option.isCorrect;

          return (
            <button
              key={option.id}
              onClick={() => handleSelect(option.id, option.isCorrect)}
              disabled={selectedAnswer !== null}
              className={`flex items-center rounded-lg border px-4 py-3 text-left text-sm font-medium transition-all ${
                showCorrect
                  ? "border-green-500 bg-green-50 text-green-700"
                  : showWrong
                    ? "border-red-500 bg-red-50 text-red-700"
                    : isSelected
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-pale)] text-[var(--color-primary)]"
                      : "border-[var(--color-neutral-200)] bg-white text-[var(--color-neutral-700)] hover:border-[var(--color-primary-light)] hover:bg-[var(--color-neutral-50)]"
              } ${selectedAnswer !== null && !isSelected ? "opacity-60" : ""}`}
            >
              {/* Radio Button */}
              <span
                className={`mr-3 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                  showCorrect
                    ? "border-green-500 bg-green-500"
                    : showWrong
                      ? "border-red-500 bg-red-500"
                      : isSelected
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]"
                        : "border-[var(--color-neutral-300)] bg-white"
                }`}
              >
                {(isSelected || showCorrect || showWrong) && (
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                )}
              </span>
              <span className="flex-1">
                <span className="mr-2 font-bold">{option.id}.</span>
                {option.text}
              </span>
            </button>
          );
        })}
      </div>

      {/* Feedback */}
      {selectedAnswer && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            isCorrect ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {isCorrect
            ? "Correct! The past tense 'analyzed' is appropriate here because the action was completed before publishing."
            : "Not quite. Consider the timeline - the analysis was completed before the publishing (past action)."}
        </div>
      )}

      {/* Reset Button */}
      {selectedAnswer && (
        <button
          onClick={handleReset}
          className="w-full rounded-lg border border-[var(--color-neutral-300)] bg-white py-2.5 text-sm font-medium text-[var(--color-neutral-600)] transition-colors hover:bg-[var(--color-neutral-50)]"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

const pricingFeatures = {
  free: [
    "5 simulation sessions",
    "Basic progress tracking",
    "Limited question bank",
    "Email support",
  ],
  pro: [
    "Unlimited simulations",
    "Advanced AI feedback",
    "Full question bank (20K+)",
    "Priority support",
    "Speaking practice mode",
  ],
};

export default function HomePage() {
  useEffect(() => {
    AOS.init({
      duration: 600,
      easing: "ease-out-cubic",
      once: true,
      offset: 50,
    });
  }, []);

  return (
    <main className="min-h-screen bg-[var(--color-neutral-50)] pt-16">
      <HomeNavbar />

      {/* Hero Section - Split 50/50 dengan Trusted by */}
      <section className="relative mx-auto w-full max-w-[1140px] px-6 pb-16 pt-20 md:px-8 lg:px-6">
        {/* Geometric shape di pojok kanan atas */}
        <div className="absolute right-0 top-0 -z-10 h-[300px] w-[300px] rounded-full bg-[var(--color-primary-pale)] opacity-50 blur-3xl" />

        <div className="grid items-center gap-12 lg:grid-cols-[6fr_5fr] lg:gap-16">
          {/* Kolom Kiri - Konten */}
          <div className="order-2 lg:order-1" data-aos="fade-up">
            <p className="mb-4 inline-flex rounded-full bg-[var(--color-primary-pale)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
              WIKIN
            </p>
            <h1 className="mb-5! max-w-2xl text-4xl font-bold leading-[1.15] text-[var(--color-neutral-900)] md:text-5xl lg:text-[52px]">
              Adaptive practice, detailed feedback, and progress tracking
            </h1>
            <p className="mb-8 max-w-xl text-lg leading-8 text-[var(--color-neutral-700)]">
              Wikin helps you prepare with AI-powered simulations, actionable
              performance insights, and flexible IELTS/TOEFL pathways tailored
              to your goals.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/auth"
                className={`${buttonVariants({ variant: "default" })} min-w-[160px] px-7 py-3.5 text-sm`}
              >
                Start Session
              </Link>
            </div>

            {/* Trusted by */}
            {/* <div className="mt-12" data-aos="fade-up" data-aos-delay="100">
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.1em] text-[var(--color-neutral-500)]">
                Trusted by learners from
              </p>
              <div className="flex flex-wrap items-center gap-4">
                {trustedBy.map((org, idx) => (
                  <div
                    key={org.abbr}
                    className="flex h-10 items-center justify-center rounded-lg border border-[var(--color-neutral-200)] bg-white px-4 text-sm font-semibold text-[var(--color-neutral-600)] transition-all hover:shadow-md hover:border-[var(--color-primary-light)]"
                    title={org.name}
                    style={{ animationDelay: `${idx * 0.1}s` }}
                  >
                    {org.abbr}
                  </div>
                ))}
              </div>
            </div> */}
          </div>

          {/* Kolom Kanan - Card Mockup */}
          <div
            className="order-1 lg:order-2"
            data-aos="fade-up"
            data-aos-delay="150"
          >
            <Card className="overflow-hidden border-[var(--color-primary-light)] shadow-xl transition-transform hover:scale-[1.02] duration-500">
              <CardContent className="p-6 bg-white">
                <FillInTheBlankDemo />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Social Proof / Stats Section - 3 Kolom Grid dengan Pill Badge */}
      <section className="mx-auto w-full max-w-[1140px] px-6 py-16 md:px-8 lg:px-6">
        <div className="mb-10 text-center" data-aos="fade-up">
          <span className="inline-flex rounded-full bg-[var(--color-primary-pale)] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-primary)] mb-3">
            Why Wikin
          </span>
          <h2 className="mt-4 text-2xl font-bold text-[var(--color-neutral-900)] md:text-3xl">
            Practice Smarter, Not Harder
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] text-[var(--color-neutral-400)]">
            Experience a preparation journey designed for real results
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {/* Point 1 - Fresh AI-Generated Questions */}
          <Card
            className="flex flex-col border-[var(--color-neutral-200)] bg-white p-6 transition-all hover:shadow-lg hover:-translate-y-1"
            data-aos="fade-up"
            data-aos-delay="0"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-primary-pale)] to-[var(--color-primary-light)]/30">
              <Sparkle
                className="h-6 w-6 text-[var(--color-primary)]"
                weight="fill"
              />
            </div>
            <h3 className="mb-2 text-[17px] font-semibold text-[var(--color-neutral-900)]">
              Infinite Fresh Questions
            </h3>
            <p className="text-[14px] leading-6 text-[var(--color-neutral-600)]">
              Never practice the same test twice. Our AI generates unique
              questions for every session, ensuring you face new challenges that
              mirror the actual exam format.
            </p>
          </Card>

          {/* Point 2 - Instant Results & Review */}
          <Card
            className="flex flex-col border-[var(--color-neutral-200)] bg-white p-6 transition-all hover:shadow-lg hover:-translate-y-1"
            data-aos="fade-up"
            data-aos-delay="150"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-accent-pale)] to-[var(--color-accent)]/30">
              <Lightning
                className="h-6 w-6 text-[var(--color-accent-dark)]"
                weight="fill"
              />
            </div>
            <h3 className="mb-2 text-[17px] font-semibold text-[var(--color-neutral-900)]">
              Instant Results & Review
            </h3>
            <p className="text-[14px] leading-6 text-[var(--color-neutral-600)]">
              Get your comprehensive score breakdown the moment you finish.
              Review your answers, see correct responses, and understand your
              mistakes immediately.
            </p>
          </Card>

          {/* Point 3 - Progress Tracking with Interactive Barchart */}
          <Card
            className="flex flex-col border-[var(--color-neutral-200)] bg-white p-6 transition-all hover:shadow-lg hover:-translate-y-1"
            data-aos="fade-up"
            data-aos-delay="300"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-primary-pale)] to-[var(--color-primary-light)]/30">
              <Gauge
                className="h-6 w-6 text-[var(--color-primary)]"
                weight="fill"
              />
            </div>
            <h3 className="mb-2 text-[17px] font-semibold text-[var(--color-neutral-900)]">
              Smart Progress Dashboard
            </h3>
            <p className="text-[14px] leading-6 text-[var(--color-neutral-600)]">
              Track your improvement across all sections with visual analytics.
              See how your band scores evolve over time.
            </p>
          </Card>
        </div>
      </section>

      {/* Feature Section - 2 Kolom dengan Stacked Cards */}
      <section className="mx-auto w-full max-w-[1140px] px-6 py-24 md:px-8 lg:px-6">
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Kolom Kiri - Judul dan Deskripsi */}
          <div className="lg:sticky lg:top-24" data-aos="fade-right">
            <p className="mb-4 inline-flex rounded-full bg-[var(--color-primary-pale)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
              Features
            </p>
            <h2 className="mb-4! text-3xl font-bold leading-tight text-[var(--color-neutral-900)] md:text-4xl">
              Experience that grows with you
            </h2>
            <p className="max-w-md text-base leading-7 text-[var(--color-neutral-400)]">
              Our AI adapts to your learning pace, providing personalized
              simulations that target your specific weaknesses and build on your
              strengths.
            </p>
          </div>

          {/* Kolom Kanan - Stacked Feature Cards */}
          <div className="space-y-4">
            {features.map((feature, idx) => {
              const IconComponent = feature.icon;
              return (
                <Card
                  key={feature.title}
                  className="border-l-[3px] border-l-[var(--color-primary)] border-[var(--color-neutral-200)] bg-white p-4 transition-all hover:shadow-md hover:-translate-y-0.5"
                  data-aos="fade-left"
                  data-aos-delay={idx * 100}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-pale)] transition-colors hover:bg-[var(--color-primary)] group">
                      <IconComponent
                        className="h-5 w-5 text-[var(--color-primary)] transition-colors group-hover:text-white"
                        weight="fill"
                      />
                    </div>
                    <div>
                      <h3 className="mb-1 text-[15px] font-semibold text-[var(--color-neutral-900)]">
                        {feature.title}
                      </h3>
                      <p className="text-[13px] leading-5 text-[var(--color-neutral-600)]">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works - Dark Section dengan Step Connectors */}
      <section
        id="how-it-works"
        className="bg-[var(--color-primary-dark)] py-24"
      >
        <div className="mx-auto w-full max-w-[1140px] px-6 md:px-8 lg:px-6">
          {/* Header centered */}
          <div
            className="mb-14 text-center flex flex-col items-center"
            data-aos="fade-up"
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-primary-light)] bg-white w-fit px-3 py-2 rounded-full">
              How It Works
            </p>
            <h2 className="text-3xl font-bold text-white! md:text-4xl">
              Maximize your score improvement
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-white/70">
              Start your first focused practice in under 2 minutes
            </p>
          </div>

          {/* 3 Step Cards Horizontal dengan Connector */}
          <div className="relative grid gap-6 md:grid-cols-3">
            {/* Connector Line (hidden on mobile) */}
            <div className="absolute left-1/2 top-[60px] hidden h-px w-[calc(66%-80px)] -translate-x-1/2 border-t border-dashed border-[var(--color-primary-fade)] opacity-40 md:block" />

            {steps.map((step, idx) => (
              <div
                key={step.title}
                className={`relative rounded-xl bg-[var(--color-primary-fade)] pt-10 pb-5 backdrop-blur-sm transition-all hover:scale-[1.02] animate-on-scroll-delay-${idx + 1}`}
              >
                {/* Nomor step besar sebagai dekorasi */}
                <span className="absolute right-4 top-2 text-[64px] font-bold leading-none text-white opacity-[0.3]">
                  {idx + 1}
                </span>

                <h3 className="relative mb-2 text-lg font-semibold text-white! px-8 bg-linear-to-t from-[var(--color-primary-fade)] to-transparent">
                  {step.title}
                </h3>
                <p className="relative text-sm leading-6 text-white/80 px-8">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission / Stats Bar Section - Centered dengan vertical dividers */}
      <section className=" w-full relative">
        <AnimatedWLogo
          size={450}
          classname="absolute top-0 -right-[15%] rotate-160"
        />

        <div className="max-w-[600px] px-6 py-24 mx-auto md:px-8 text-center">
          <h2 className="mb-4! text-3xl font-bold leading-tight text-[var(--color-neutral-900)] md:text-4xl">
            We have helped innovative learners reach their goals
          </h2>
          <p className="mb-10 text-base text-[var(--color-neutral-400)]">
            Join thousands of students and professionals who transformed their
            test preparation journey with Wikin.
          </p>

          {/* Stats dengan vertical divider */}
          <div className="flex items-center justify-center">
            {missionStats.map((stat, idx) => (
              <div key={stat.label} className="flex items-center">
                <div className="px-6 text-center md:px-10">
                  <p
                    className="text-[40px] font-bold text-[var(--color-primary)]"
                    style={{
                      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                    }}
                  >
                    {stat.value}
                  </p>
                  <p className="mt-1 text-[13px] text-[var(--color-neutral-500)]">
                    {stat.label}
                  </p>
                </div>
                {idx < missionStats.length - 1 && (
                  <div className="h-10 w-px bg-[var(--color-neutral-300)]" />
                )}
              </div>
            ))}
          </div>
        </div>

        <AnimatedWLogo
          size={400}
          classname="absolute bottom-0 -left-[13%] -rotate-15"
        />
      </section>

      {/* Testimonials */}
      <section className="mx-auto w-full max-w-[1140px] px-6 py-16 md:px-8 lg:px-6">
        <div className="mb-10 text-center">
          <span className="inline-flex rounded-full bg-[var(--color-primary-pale)] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-primary)] mb-3">
            Testimonials
          </span>
          <h2 className="text-2xl font-bold text-[var(--color-neutral-900)] md:text-3xl">
            What our learners say
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {testimonials.map((item) => (
            <Card
              key={item.name}
              className="rounded-xl border-[var(--color-neutral-200)] bg-white p-6 transition-all hover:shadow-md"
            >
              <p className="mb-4 text-[15px] italic leading-6 text-[var(--color-neutral-600)]">
                “{item.quote}”
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-neutral-900)]">
                    {item.name}
                  </p>
                  <p className="text-xs text-[var(--color-neutral-500)]">
                    {item.role}
                  </p>
                </div>
                <span className="rounded-full bg-[var(--color-accent-pale)] px-2.5 py-1 text-xs font-semibold text-[var(--color-accent-dark)]">
                  {item.score}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="mx-auto w-full max-w-[720px] px-6 py-16 md:px-8">
        <div className="mb-10 text-center" data-aos="fade-up">
          <span className="inline-flex rounded-full bg-[var(--color-primary-pale)] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-primary)] mb-3">
            FAQ
          </span>
          <h2 className="text-2xl font-bold text-[var(--color-neutral-900)] md:text-3xl">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <Card
              key={faq.q}
              className="rounded-xl border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] p-5"
              data-aos="fade-up"
              data-aos-delay={idx * 100}
            >
              <p className="mb-2 text-sm font-semibold text-[var(--color-neutral-900)]">
                {faq.q}
              </p>
              <p className="text-[13px] leading-5 text-[var(--color-neutral-600)]">
                {faq.a}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing Section - 2 Card dengan Feature List */}
      <section className="mx-auto w-full max-w-[800px] px-6 py-16 md:px-8 lg:px-6">
        <div className="mb-10 text-center" data-aos="fade-up">
          <span className="inline-flex rounded-full bg-[var(--color-primary-pale)] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-primary)] mb-3">
            Pricing
          </span>
          <h2 className="text-2xl font-bold text-[var(--color-neutral-900)] md:text-3xl">
            Choose your plan
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] text-[var(--color-neutral-400)]">
            Start free and upgrade when you need more features
          </p>
        </div>

        <div className="relative">
          {/* Blur Overlay */}
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl backdrop-blur-sm bg-white/50 -rotate-6 gap-1">
            <Link
              href="/auth"
              className="rounded-xl bg-[var(--color-primary-light)] px-6 py-3 shadow-lg"
            >
              <span className="text-sm font-semibold text-[var(--color-primary-pale)] tracking-[0.1em]">
                No Need to Pay
              </span>
            </Link>
            <span className="text-xs text-[var(--color-neutral-500)]">
              *for now hehe
            </span>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {/* Free Plan */}
            <Card
              className="border-[var(--color-neutral-200)] bg-white p-6"
              data-aos="fade-right"
              data-aos-delay="100"
            >
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-[var(--color-neutral-900)]">
                  Free
                </h3>
                <p className="text-sm text-[var(--color-neutral-500)]">
                  For starters
                </p>
              </div>
              <p className="mb-6 text-3xl font-bold text-[var(--color-neutral-900)]">
                $0
                <span className="text-base font-normal text-[var(--color-neutral-500)]">
                  /month
                </span>
              </p>
              <ul className="mb-6 space-y-3">
                {pricingFeatures.free.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-[13px] text-[var(--color-neutral-600)]"
                  >
                    <Check className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/auth"
                className="block w-full rounded-[10px] border border-[var(--color-primary)] py-3 text-center text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary-pale)] transition-colors"
              >
                Get Started
              </Link>
            </Card>

            {/* Pro Plan - Highlighted */}
            <Card
              className="relative border-2 border-[var(--color-primary)] bg-white p-6"
              data-aos="fade-left"
              data-aos-delay="200"
            >
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--color-primary-pale)] px-3 py-1 text-xs font-semibold text-[var(--color-primary-dark)]">
                Most Popular
              </span>
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-[var(--color-neutral-900)]">
                  Pro
                </h3>
                <p className="text-sm text-[var(--color-neutral-500)]">
                  For serious learners
                </p>
              </div>
              <p className="mb-6 text-3xl font-bold text-[var(--color-primary)]">
                $12
                <span className="text-base font-normal text-[var(--color-neutral-500)]">
                  /month
                </span>
              </p>
              <ul className="mb-6 space-y-3">
                {pricingFeatures.pro.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-[13px] text-[var(--color-neutral-600)]"
                  >
                    <Check className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/auth"
                className="block w-full rounded-[10px] bg-[var(--color-primary)] py-3 text-center text-sm font-semibold text-white shadow-[0_4px_14px_rgba(93,63,211,0.35)] hover:bg-[var(--color-primary-dark)] transition-colors"
              >
                Upgrade to Pro
              </Link>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Banner - Split Horizontal */}
      <section
        className="mx-auto w-full max-w-[1140px] px-6 pb-16 md:px-8 lg:px-6"
        data-aos="fade-up"
      >
        <div className="relative overflow-hidden rounded-3xl px-8 py-20 text-white md:px-16 bg-[var(--color-primary)]">
          {/* Geometric pattern di pojok kanan */}
          <div className="absolute -right-10 -top-10 h-[200px] w-[200px] rounded-full bg-white/5" />
          <div className="absolute -bottom-16 -right-16 h-[250px] w-[250px] rounded-full bg-white/5" />

          <div className="relative flex flex-col items-center justify-between gap-8 md:flex-row ">
            {/* Kolom Kiri - Judul */}
            <div className="max-w-md text-center md:text-left">
              <h2 className="mb-3! text-3xl font-bold leading-tight md:text-4xl text-white!">
                Ready to level up your preparation?
              </h2>
              <p className="text-white/80">
                Start your adaptive learning journey today and see results in
                weeks, not months.
              </p>
            </div>

            {/* Kolom Kanan - 2 Tombol */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/auth"
                className="min-w-[160px] rounded-[10px] bg-white px-7 py-3.5 text-center text-sm font-semibold text-[var(--color-primary)] shadow-lg hover:bg-white/90 transition-colors"
              >
                Get Started Now
              </Link>
              <Link
                href="/"
                className="min-w-[160px] rounded-[10px] border-2 border-white/50 px-7 py-3.5 text-center text-sm font-semibold text-white hover:border-white hover:bg-white/10 transition-colors"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>

      <HomeFooter />
    </main>
  );
}

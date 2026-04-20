import AnimatedWLogo from "@/components/AnimatedLogo";

export function MaintenanceScreen() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(123,97,228,0.22),_transparent_32%),linear-gradient(180deg,_#f8f7ff_0%,_#ffffff_100%)] px-6 py-12">
      <div className="absolute inset-0 opacity-60">
        <div className="absolute left-[-80px] top-[-80px] h-56 w-56 rounded-full bg-[var(--color-primary-pale)] blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-40px] h-72 w-72 rounded-full bg-[rgba(61,214,140,0.14)] blur-3xl" />
      </div>

      <section className="relative w-full max-w-3xl overflow-hidden rounded-[32px] border border-white/70 bg-white/88 p-8 shadow-[0_30px_80px_rgba(69,39,160,0.16)] backdrop-blur md:p-12">
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <div className="rounded-[28px] flex items-center justify-center pt-5 pr-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
            <AnimatedWLogo size={112} />
          </div>

          <span className="mb-4 inline-flex rounded-full border border-[rgba(93,63,211,0.14)] bg-[rgba(93,63,211,0.08)] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--color-primary)]">
            WIKIN
          </span>

          <h1 className="text-4xl font-extrabold tracking-[-0.04em] md:text-5xl !text-[var(--color-primary)]">
            Under Maintenance
          </h1>

          <p className="mt-5 max-w-xl text-base leading-7 text-[var(--color-neutral-500)] md:text-lg">
            We will come back soon, there's something to fix now... see you :)
          </p>
        </div>
      </section>
    </main>
  );
}

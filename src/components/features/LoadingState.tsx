import AnimatedWLogo from "@/components/AnimatedLogo";

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <AnimatedWLogo size={48} />
      {message && (
        <p className="text-sm text-[var(--color-neutral-400)]">{message}</p>
      )}
    </div>
  );
}

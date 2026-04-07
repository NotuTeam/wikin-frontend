"use client";

import { Button, Card, Typography, Badge, Modal } from "@/components/atoms";
import { useSessionRecovery } from "@/hooks";

interface SessionRecoveryProps {
  onResume: () => void;
  onExit: () => void;
}

export function SessionRecovery({ onResume, onExit }: SessionRecoveryProps) {
  const { recoverableSession, isLoading } = useSessionRecovery();

  if (isLoading || !recoverableSession) return null;

  return (
    <Card className="mb-4 bg-amber-50 border-amber-200" padding="md">
      <Typography variant="body" className="mb-3">
        Your previous session is still active (up to 3 hours). Continue or exit to start a new session.
      </Typography>
      <div className="flex gap-2">
        <Button variant="success" onClick={onResume}>
          Resume Session
        </Button>
        <Button variant="danger" onClick={onExit}>
          Exit Session
        </Button>
      </div>
    </Card>
  );
}

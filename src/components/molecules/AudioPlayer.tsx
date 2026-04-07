"use client";

import { Button } from "@/components/atoms";

interface AudioPlayerProps {
  trackLabel: string;
  trackStart: number;
  trackEnd: number;
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
  disabled?: boolean;
}

export function AudioPlayer({
  trackLabel,
  trackStart,
  trackEnd,
  isPlaying,
  onPlay,
  onStop,
  disabled = false,
}: AudioPlayerProps) {
  return (
    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
      <p className="text-sm font-medium text-blue-900 mb-3">
        Audio: {trackLabel} (Questions {trackStart}-{trackEnd})
      </p>
      <div className="flex gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={onPlay}
          disabled={disabled || isPlaying}
          isLoading={isPlaying}
        >
          {isPlaying ? "Playing..." : "Play TTS"}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onStop}
          disabled={!isPlaying}
        >
          Stop
        </Button>
      </div>
    </div>
  );
}

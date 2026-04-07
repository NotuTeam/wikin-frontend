"use client";

import { useEffect, useRef, useState } from "react";

export function useTTS() {
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stopTts = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    speechRef.current = null;
    setTtsPlaying(false);
  };

  const playTts = (text: string) => {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window) ||
      !text
    )
      return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.onend = () => setTtsPlaying(false);
    utterance.onerror = () => setTtsPlaying(false);
    speechRef.current = utterance;
    setTtsPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => stopTts();
  }, []);

  return { ttsPlaying, playTts, stopTts };
}

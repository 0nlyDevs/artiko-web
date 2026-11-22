import { useCallback, useEffect, useRef, useState } from "react";
import { secondsLeft } from "@/features/scan/scan-logic";

/** A wait in whole seconds. It reads the clock at each tick, so a tab left in the background does not stretch it. */
export function useCountdown(): { left: number; start: (seconds: number) => void } {
  const [left, setLeft] = useState(0);
  const deadline = useRef(0);
  const start = useCallback((seconds: number) => {
    deadline.current = Date.now() + seconds * 1000;
    setLeft(seconds);
  }, []);
  const running = left > 0;
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setLeft(secondsLeft(deadline.current, Date.now())), 250);
    return () => window.clearInterval(timer);
  }, [running]);
  return { left, start };
}

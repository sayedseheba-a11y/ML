import { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  durationMs?: number;
  className?: string;
}

export function AnimatedNumber({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  durationMs = 650,
  className = '',
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState<number>(value);
  const prevRef = useRef<number>(value);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setDisplay(value);
      prevRef.current = value;
      return;
    }

    const startVal = prevRef.current;
    const delta = value - startVal;
    if (Math.abs(delta) < 1e-6) {
      setDisplay(value);
      return;
    }

    let rafId = 0;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / durationMs);
      // Cubic ease-out settling curve
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(startVal + delta * eased);

      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        prevRef.current = value;
        setDisplay(value);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [value, durationMs]);

  const formatted = display.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

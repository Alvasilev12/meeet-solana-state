import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Animates a number from 0 to `target` when the element scrolls into view.
 * Returns [ref, animatedValue].
 */
export function useScrollCounter(target: number, duration = 1500): [React.RefCallback<HTMLElement>, number] {
  const [value, setValue] = useState(0);
  const hasAnimated = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const ref = useCallback(
    (node: HTMLElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (!node) return;

      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !hasAnimated.current) {
            hasAnimated.current = true;
            const startTime = performance.now();
            const tick = (now: number) => {
              const elapsed = now - startTime;
              const progress = Math.min(elapsed / duration, 1);
              const eased = 1 - Math.pow(1 - progress, 3);
              setValue(Math.round(target * eased));
              if (progress < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }
        },
        { threshold: 0.3 }
      );
      observerRef.current.observe(node);
    },
    [target, duration]
  );

  return [ref, value];
}

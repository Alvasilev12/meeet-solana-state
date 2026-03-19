import { useEffect, useRef, useState, ReactNode } from "react";

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  animation?: "fade-up" | "fade-left" | "fade-right" | "scale" | "fade";
}

const ANIMATION_CLASSES: Record<string, { hidden: string; visible: string }> = {
  "fade-up": {
    hidden: "opacity-0 translate-y-8",
    visible: "opacity-100 translate-y-0",
  },
  "fade-left": {
    hidden: "opacity-0 -translate-x-8",
    visible: "opacity-100 translate-x-0",
  },
  "fade-right": {
    hidden: "opacity-0 translate-x-8",
    visible: "opacity-100 translate-x-0",
  },
  scale: {
    hidden: "opacity-0 scale-95",
    visible: "opacity-100 scale-100",
  },
  fade: {
    hidden: "opacity-0",
    visible: "opacity-100",
  },
};

const AnimatedSection = ({
  children,
  className = "",
  delay = 0,
  animation = "fade-up",
}: AnimatedSectionProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  const anim = ANIMATION_CLASSES[animation];

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? anim.visible : anim.hidden} ${className}`}
    >
      {children}
    </div>
  );
};

export default AnimatedSection;

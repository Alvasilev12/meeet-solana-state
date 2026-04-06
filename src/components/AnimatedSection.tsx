import { ReactNode, forwardRef } from "react";

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  animation?: "fade-up" | "fade-left" | "fade-right" | "scale" | "fade";
}

const AnimatedSection = forwardRef<HTMLDivElement, AnimatedSectionProps>(({
  children,
  className = "",
  delay = 0,
  animation: _animation = "fade-up",
}, forwardedRef) => {
  const visibleStyle = {
    opacity: 1,
    transform: "none",
    filter: "none",
    ...(delay > 0 ? { animationDelay: `${delay}ms` } : {}),
  };

  return (
    <div
      ref={forwardedRef}
      className={className}
      style={visibleStyle}
    >
      {children}
    </div>
  );
});

AnimatedSection.displayName = "AnimatedSection";

export default AnimatedSection;

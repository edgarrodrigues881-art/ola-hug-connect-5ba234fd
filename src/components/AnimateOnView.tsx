import React from "react";
import { useAnimateOnView } from "@/hooks/useAnimateOnView";

interface AnimateOnViewProps {
  children: React.ReactNode;
  animation?: "fade-in" | "slide-up" | "scale-in";
  delay?: number;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

/**
 * Wrapper component that animates children when entering the viewport.
 * GPU-only animations (transform + opacity), 60fps guaranteed.
 */
const AnimateOnView = ({
  children,
  animation = "slide-up",
  delay = 0,
  className = "",
  as: Tag = "div",
}: AnimateOnViewProps) => {
  const { ref, className: animClass } = useAnimateOnView({ animation, delay });

  return (
    <Tag ref={ref as any} className={`${animClass} ${className}`.trim()}>
      {children}
    </Tag>
  );
};

export default AnimateOnView;

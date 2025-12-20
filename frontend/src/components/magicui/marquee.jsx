import React, { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";

export function Marquee({
  className,
  reverse = false,
  pauseOnHover = false,
  children,
  vertical = false,
  repeat = 4,
  ...props
}) {
  const [isTouching, setIsTouching] = useState(false);
  const containerRef = useRef(null);

  // Helper to detect touch-capable mobile device and small screen.
  const isTouchMobile = () => {
    if (typeof window === "undefined") return false;
    const hasTouch = ("ontouchstart" in window) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
    const smallScreen = window.innerWidth <= 768; // assumption: mobile breakpoint
    return hasTouch && smallScreen;
  };

  useEffect(() => {
    // If user resizes while touching, ensure we stop touching state.
    const onResize = () => {
      if (!isTouchMobile()) setIsTouching(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleTouchStart = (e) => {
    if (!isTouchMobile()) return;
    setIsTouching(true);
  };

  const handleTouchMove = (e) => {
    if (!isTouchMobile()) return;
    // keep paused while moving
    setIsTouching(true);
  };

  const handleTouchEnd = () => {
    if (!isTouchMobile()) return;
    // small timeout so quick taps still feel natural before animation resumes
    window.setTimeout(() => setIsTouching(false), 120);
  };

  const overflowClass = isTouching ? (vertical ? "overflow-y-auto" : "overflow-x-auto") : "overflow-hidden";

  return (
    <div
      {...props}
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={cn(
        "group flex p-2 [--duration:40s] [--gap:1rem] [gap:var(--gap)]",
        overflowClass,
        {
          "flex-row": !vertical,
          "flex-col": vertical,
        },
        className
      )}
      style={{ WebkitOverflowScrolling: isTouching ? "touch" : undefined, touchAction: vertical ? "pan-y" : "pan-x" }}>
      {Array(repeat)
        .fill(0)
        .map((_, i) => (
          <div
            key={i}
            className={cn("flex shrink-0 justify-around [gap:var(--gap)]", {
              "animate-marquee flex-row": !vertical,
              "animate-marquee-vertical flex-col": vertical,
              "group-hover:[animation-play-state:paused]": pauseOnHover,
              "[animation-direction:reverse]": reverse,
            })}
            // pause the CSS animation while the user is touching (mobile)
            style={{ animationPlayState: isTouching ? "paused" : undefined }}>
            {children}
          </div>
        ))}
    </div>
  );
}

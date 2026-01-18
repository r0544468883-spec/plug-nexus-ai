import { useEffect, useState } from 'react';

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TourOverlayProps {
  targetSelector: string;
  isActive: boolean;
}

export function TourOverlay({ targetSelector, isActive }: TourOverlayProps) {
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);

  useEffect(() => {
    if (!isActive || !targetSelector) {
      setSpotlightRect(null);
      return;
    }

    const updateSpotlight = () => {
      const element = document.querySelector(targetSelector);
      if (element) {
        const rect = element.getBoundingClientRect();
        const padding = 8;
        setSpotlightRect({
          top: rect.top - padding,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        });

        // Scroll element into view if needed
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    // Initial update
    const timer = setTimeout(updateSpotlight, 300);

    // Update on resize/scroll
    window.addEventListener('resize', updateSpotlight);
    window.addEventListener('scroll', updateSpotlight, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateSpotlight);
      window.removeEventListener('scroll', updateSpotlight, true);
    };
  }, [targetSelector, isActive]);

  if (!isActive || !spotlightRect) return null;

  return (
    <div className="fixed inset-0 z-[9998] pointer-events-none">
      {/* Dark overlay with hole */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={spotlightRect.left}
              y={spotlightRect.top}
              width={spotlightRect.width}
              height={spotlightRect.height}
              rx="12"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.6)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Spotlight border/glow */}
      <div
        className="absolute border-2 border-primary rounded-xl shadow-[0_0_20px_rgba(var(--primary),0.5)] transition-all duration-300"
        style={{
          top: spotlightRect.top,
          left: spotlightRect.left,
          width: spotlightRect.width,
          height: spotlightRect.height,
        }}
      />
    </div>
  );
}

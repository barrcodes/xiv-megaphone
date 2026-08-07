import { Slider as SliderPrimitive } from "radix-ui";
import type * as React from "react";

import { cn } from "@/lib/utils";

type SliderProps = React.ComponentProps<typeof SliderPrimitive.Root> & {
  markAt?: number;
};

function Slider({ className, markAt, ...props }: SliderProps) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn(
        "relative flex w-full touch-none items-center select-none data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative grow overflow-hidden rounded-full bg-secondary h-1.5"
      >
        <SliderPrimitive.Range data-slot="slider-range" className="absolute h-full bg-primary" />
        {markAt !== undefined && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 z-10 h-2.5 w-px -translate-x-1/2 -translate-y-1/2 bg-primary/80"
            style={{
              // Account for the thumb's 16px width when mapping a value to the track.
              left: `calc(${markAt * 100}% + ${(0.5 - markAt) * 16}px)`,
            }}
          />
        )}
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        data-slot="slider-thumb"
        className="block size-4 rounded-full border border-primary/50 bg-background shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 hover:border-primary"
      />
    </SliderPrimitive.Root>
  );
}

export { Slider };

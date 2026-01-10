import { useCallback, useRef, useState } from "react";
import { ChevronRightIcon } from "lucide-react";

import { Spinner } from "@repo/web-ui/spinner";

interface SlideToConfirmProps {
  onConfirm: () => void;
  text?: string;
  isLoading?: boolean;
  disabled?: boolean;
}

interface SliderProps {
  onConfirm: () => void;
  text: string;
  disabled?: boolean;
}

function Slider({ onConfirm, text, disabled = false }: SliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const offsetXRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [offsetX, setOffsetX] = useState(0);

  const HEAD_SIZE = 40; // tailwind w-10
  const THRESHOLD = 0.9; // 90% to confirm

  const displayOffset = disabled ? 0 : offsetX;

  const getMaxOffset = useCallback(() => {
    if (!containerRef.current) return 0;
    return containerRef.current.offsetWidth - HEAD_SIZE;
  }, []);

  const handleStart = useCallback(() => {
    if (disabled) return;
    isDraggingRef.current = true;
    setIsDragging(true);
  }, [disabled]);

  const handleMove = useCallback(
    (clientX: number) => {
      if (!isDraggingRef.current || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const maxOffset = getMaxOffset();
      const newOffset = Math.min(
        Math.max(0, clientX - rect.left - HEAD_SIZE / 2),
        maxOffset,
      );
      offsetXRef.current = newOffset;
      setOffsetX(newOffset);
    },
    [getMaxOffset],
  );

  const handleEnd = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);

    const maxOffset = getMaxOffset();
    const progress = offsetXRef.current / maxOffset;

    if (progress >= THRESHOLD) {
      onConfirm();
    } else {
      offsetXRef.current = 0;
      setOffsetX(0);
    }
  }, [getMaxOffset, onConfirm]);

  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart();
    handleMove(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  const handleMouseDownWithGlobal = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart();

    const onMouseMove = (ev: MouseEvent) => handleMove(ev.clientX);
    const onMouseUp = () => {
      handleEnd();
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div
      ref={containerRef}
      className={`border-border bg-muted text-muted-foreground relative w-full overflow-hidden rounded-xl border select-none ${disabled ? "opacity-50" : ""}`}
    >
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-medium"
        style={{
          clipPath: `inset(0 0 0 ${displayOffset + HEAD_SIZE}px)`,
        }}
      >
        {text}
      </div>

      <div
        className={`absolute top-0 left-0 h-full rounded-xl bg-linear-to-r transition-none ${disabled ? "bg-muted-foreground/30" : "bg-primary/70"}`}
        style={{
          width: displayOffset + HEAD_SIZE,
          transition: isDragging ? "none" : "width 0.3s ease-out",
        }}
      />

      <div
        className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-xl ${disabled ? "bg-muted-foreground text-muted cursor-not-allowed" : "bg-primary text-primary-foreground cursor-grab active:cursor-grabbing"}`}
        style={{
          transform: `translateX(${displayOffset}px)`,
          transition: isDragging ? "none" : "transform 0.3s ease-out",
        }}
        onMouseDown={handleMouseDownWithGlobal}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <ChevronRightIcon className="h-6 w-6" />
      </div>
    </div>
  );
}

export function SlideToConfirm({
  onConfirm,
  text = "Slide to confirm",
  isLoading = false,
  disabled = false,
}: SlideToConfirmProps) {
  if (isLoading) {
    return (
      <div className="border-border bg-primary text-primary-foreground relative flex h-10 w-full items-center justify-center gap-2 overflow-hidden rounded-xl border select-none">
        <Spinner /> Processing...
      </div>
    );
  }

  return <Slider onConfirm={onConfirm} text={text} disabled={disabled} />;
}

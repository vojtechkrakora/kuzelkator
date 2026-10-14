"use client";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";
import type { ObsSettings } from "@/domain/obs-settings";

// Fit only when necessary: every nominated player must remain visible even
// when the browser source is smaller than its recommended dimensions.
export function ObsFrame({
  settings,
  children,
}: {
  settings: ObsSettings;
  children: ReactNode;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const outer = frame.current!;
    const inner = content.current!;
    const measure = () => {
      setHeight(outer.clientHeight);
      const requested = settings.scale / 100;
      const natural = inner.scrollHeight;
      const next = Math.min(
        1,
        outer.clientHeight / Math.max(1, natural * requested),
      );
      setFit((current) => (Math.abs(current - next) > 0.002 ? next : current));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(outer);
    observer.observe(inner);
    measure();
    return () => observer.disconnect();
  }, [settings.scale]);
  const zoom = (settings.scale / 100) * fit;
  return (
    <div
      ref={frame}
      className="obs-frame"
      style={{ "--obs-gap": `${settings.gap}px` } as CSSProperties}
    >
      <div
        ref={content}
        className="obs-frame-content"
        style={
          {
            zoom,
            "--obs-height": `${height / (settings.scale / 100)}px`,
          } as CSSProperties
        }
      >
        {children}
      </div>
    </div>
  );
}

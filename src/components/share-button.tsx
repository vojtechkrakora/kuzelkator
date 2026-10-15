"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Share2 } from "lucide-react";
import { shareUrl } from "@/lib/share-url";

export function ShareButton({
  title,
  href,
  label = "Sdílet",
  disabled = false,
}: {
  title: string;
  href?: string;
  label?: string;
  disabled?: boolean;
}) {
  const [message, setMessage] = useState("");
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => () => clearTimeout(dismissTimer.current), []);
  async function share() {
    clearTimeout(dismissTimer.current);
    const url = shareUrl(
      new URL(href ?? window.location.href, window.location.origin).href,
    );
    setBusy(true);
    setMessage("");
    setManual("");
    try {
      if (navigator.share) {
        try {
          await navigator.share({ title, url });
          return;
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") return;
        }
      }
      try {
        await navigator.clipboard.writeText(url);
        setMessage("Odkaz zkopírován.");
        dismissTimer.current = setTimeout(() => setMessage(""), 3000);
      } catch {
        setManual(url);
        setMessage(
          "Odkaz se nepodařilo zkopírovat. Označte a zkopírujte jej z pole níže.",
        );
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="share-control">
      <button
        type="button"
        className="share-button"
        onClick={share}
        disabled={disabled || busy}
        aria-label={label}
        title={label}
      >
        <Share2 size={18} aria-hidden="true" />
      </button>
      {message &&
        !manual &&
        createPortal(
          <div role="status" className="share-toast">
            <Check size={18} aria-hidden="true" />
            {message}
          </div>,
          document.body,
        )}
      {manual && (
        <div className="share-fallback">
          <p role="status" className="share-status">
            {message}
          </p>
          <label className="share-manual">
            Odkaz ke zkopírování
            <input
              readOnly
              value={manual}
              onFocus={(event) => event.target.select()}
            />
          </label>
        </div>
      )}
    </div>
  );
}

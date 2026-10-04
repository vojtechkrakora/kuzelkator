"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const key = "kuzelkator:feed-return:v1";
type Snapshot = {
  url: string;
  match: string;
  scroll: number;
  details: Record<string, boolean>;
};
function readSnapshot(): Snapshot | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) ?? "null");
    return value &&
      typeof value.url === "string" &&
      /^\/(?:\?|$)/.test(value.url) &&
      typeof value.match === "string" &&
      Number.isFinite(value.scroll) &&
      value.details &&
      typeof value.details === "object"
      ? value
      : null;
  } catch {
    return null;
  }
}

export function useFeedReturn(loaded: boolean) {
  const restored = useRef(false);
  useEffect(() => {
    const capture = (event: MouseEvent) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link = (event.target as Element).closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (
        !link ||
        link.origin !== location.origin ||
        !/^\/matches\/\d+$/.test(link.pathname)
      )
        return;
      const details = Object.fromEntries(
        [...document.querySelectorAll<HTMLDetailsElement>("details[id]")].map(
          (el) => [el.id, el.open],
        ),
      );
      const picker = document.querySelector<HTMLDetailsElement>(
        "#competitions > details",
      );
      if (picker) details.competitionPicker = picker.open;
      try {
        sessionStorage.setItem(
          key,
          JSON.stringify({
            url: location.pathname + location.search,
            match: link.pathname,
            scroll: scrollY,
            details,
          }),
        );
      } catch {
        /* Navigation still works without storage. */
      }
    };
    document.addEventListener("click", capture, true);
    return () => document.removeEventListener("click", capture, true);
  }, []);
  useEffect(() => {
    if (!loaded || restored.current) return;
    const snapshot = readSnapshot();
    if (!snapshot || snapshot.url !== location.pathname + location.search)
      return;
    restored.current = true;
    for (const [id, open] of Object.entries(snapshot.details)) {
      const element =
        id === "competitionPicker"
          ? document.querySelector("#competitions > details")
          : document.getElementById(id);
      if (element instanceof HTMLDetailsElement) element.open = open;
    }
    const frame = requestAnimationFrame(() =>
      window.scrollTo({ top: snapshot.scroll, behavior: "instant" }),
    );
    return () => cancelAnimationFrame(frame);
  }, [loaded]);
}

export function BackToFeed() {
  const [href, setHref] = useState("/");
  useEffect(() => {
    const snapshot = readSnapshot();
    if (snapshot?.match === location.pathname) setHref(snapshot.url);
  }, []);
  return (
    <Link href={href} scroll={false} className="back-link">
      <ArrowLeft size={17} /> Zpět na přehled
    </Link>
  );
}

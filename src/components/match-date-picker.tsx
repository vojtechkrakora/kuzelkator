"use client";

import { useId, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { dayLabel, todayPrague } from "@/lib/dates";

export function MatchDatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (day: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const [month, setMonth] = useState(value.slice(0, 7));
  const first = new Date(`${month}-01T12:00:00Z`);
  const year = first.getUTCFullYear();
  const monthIndex = first.getUTCMonth();
  const count = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7;
  const today = todayPrague();
  function open() {
    setMonth(value.slice(0, 7));
    dialog.current?.showModal();
  }
  function select(day: string) {
    onChange(day);
    dialog.current?.close();
  }
  function move(delta: number) {
    setMonth(
      new Date(Date.UTC(year, monthIndex + delta, 1, 12))
        .toISOString()
        .slice(0, 7),
    );
  }
  return (
    <>
      <div className="date-control">
        <button
          type="button"
          className="calendar-open"
          aria-label="Otevřít kalendář"
          aria-haspopup="dialog"
          onClick={open}
        >
          <CalendarDays size={24} aria-hidden="true" />
        </button>
        <input
          aria-label="Datum zápasů"
          type="date"
          value={value}
          onClick={(event) => {
            event.preventDefault();
            open();
          }}
          onChange={(event) => {
            if (event.target.value) onChange(event.target.value);
          }}
        />
      </div>
      <dialog
        className="match-calendar"
        ref={dialog}
        aria-labelledby={title}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className="calendar-heading">
          <h2 id={title}>Vyberte den zápasů</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Zavřít kalendář"
            onClick={() => dialog.current?.close()}
          >
            <X size={22} />
          </button>
        </div>
        <div className="calendar-month">
          <button
            type="button"
            className="icon-button"
            aria-label="Předchozí měsíc"
            onClick={() => move(-1)}
          >
            <ChevronLeft size={24} />
          </button>
          <strong aria-live="polite">
            {new Intl.DateTimeFormat("cs", {
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            }).format(first)}
          </strong>
          <button
            type="button"
            className="icon-button"
            aria-label="Následující měsíc"
            onClick={() => move(1)}
          >
            <ChevronRight size={24} />
          </button>
        </div>
        <div className="calendar-days">
          {["Po", "Út", "St", "Čt", "Pá", "So", "Ne"].map((day) => (
            <span className="calendar-weekday" key={day}>
              {day}
            </span>
          ))}
          {Array.from({ length: offset }, (_, i) => (
            <span key={`empty-${i}`} />
          ))}
          {Array.from({ length: count }, (_, i) => {
            const day = `${month}-${String(i + 1).padStart(2, "0")}`;
            return (
              <button
                type="button"
                key={day}
                aria-label={`${dayLabel(day, true)} ${year}`}
                aria-pressed={day === value}
                aria-current={day === today ? "date" : undefined}
                onClick={() => select(day)}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="button calendar-today"
          onClick={() => select(today)}
        >
          Přejít na dnešek
        </button>
      </dialog>
    </>
  );
}

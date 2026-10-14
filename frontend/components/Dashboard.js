"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { ErrorBox, INPUT_CLASS } from "@/components/AuthForm";
import { checkIn, checkOut, clearToken } from "@/lib/api";

// Shared data loading, formatting and UI pieces for the dashboard pages

// The signed-in user for the dashboard shell; pages call refresh() after changing the profile
export const MeContext = createContext({ me: null, refresh: () => {} });

export function useMe() {
  return useContext(MeContext);
}

// Loads data on mount and whenever `loader` changes, so pass a stable function
// (a module-level API function or a useCallback). A 401 sends the user to sign in.
export function useApi(loader) {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Returns the message to show, or "" when the user is being redirected
  const describeError = useCallback(
    (err) => {
      if (err.status === 401) {
        clearToken();
        router.replace("/login");
        return "";
      }
      return err.message;
    },
    [router],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    loader()
      .then((result) => {
        if (!active) return;
        setData(result);
        setError("");
      })
      .catch((err) => active && setError(describeError(err)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [loader, describeError]);

  return { data, setData, error, loading, describeError };
}

// "2026-10-03" as a local date (new Date("2026-10-03") would be UTC midnight)
export function parseDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// A local date as "YYYY-MM-DD"
export function dateValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function formatDate(value, options = { day: "numeric", month: "short", year: "numeric" }) {
  return value ? parseDate(value).toLocaleDateString("en-IN", options) : "—";
}

export function formatTime(value) {
  return value ? new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—";
}

export function formatHours(hours) {
  if (hours === null || hours === undefined) return "—";
  const minutes = Math.round(hours * 60);
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

export function initials(person) {
  return `${person.first_name?.[0] || ""}${person.last_name?.[0] || ""}`.toUpperCase();
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function Card({ title, action, className = "", children }) {
  return (
    <section className={`min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatTile({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

// Every status is shown as a dot plus its label, never by color alone
export const STATUS = {
  present: { label: "Present", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  half_day: { label: "Half day", dot: "bg-amber-500", badge: "bg-amber-50 text-amber-800 ring-amber-200" },
  absent: { label: "Absent", dot: "bg-red-500", badge: "bg-red-50 text-red-800 ring-red-200" },
  leave: { label: "On leave", dot: "bg-sky-500", badge: "bg-sky-50 text-sky-800 ring-sky-200" },
  weekly_off: { label: "Weekly off", dot: "bg-slate-300", badge: "bg-slate-100 text-slate-600 ring-slate-200" },
  not_marked: { label: "Not marked", dot: "bg-slate-400", badge: "bg-slate-100 text-slate-700 ring-slate-200" },
  pending: { label: "Pending", dot: "bg-amber-500", badge: "bg-amber-50 text-amber-800 ring-amber-200" },
  approved: { label: "Approved", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  rejected: { label: "Rejected", dot: "bg-red-500", badge: "bg-red-50 text-red-800 ring-red-200" },
  cancelled: { label: "Cancelled", dot: "bg-slate-400", badge: "bg-slate-100 text-slate-600 ring-slate-200" },
};

export function StatusBadge({ status, label }) {
  const style = STATUS[status];
  if (!style) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${style.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
      {label || style.label}
    </span>
  );
}

export function Avatar({ person, size = "h-10 w-10 text-sm" }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700 ${size}`}
      aria-hidden="true"
    >
      {initials(person)}
    </span>
  );
}

// Today's check-in / check-out; onChange reloads whatever the page shows after marking
export function TodayCard({ today, onChange, describeError }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function mark(action) {
    setBusy(true);
    setError("");
    try {
      await action();
      await onChange();
    } catch (err) {
      setError(describeError(err));
    }
    setBusy(false);
  }

  // A day marked without a check-in time (by HR) has nothing left to do here
  const done = today.check_out || (today.marked && !today.check_in);
  const status = today.check_out ? "Checked out" : today.check_in ? "Checked in" : today.marked ? "Marked" : "Not checked in";

  return (
    <Card title="Today" action={<span className="text-sm text-slate-500">{formatDate(today.date, { weekday: "long", day: "numeric", month: "long" })}</span>}>
      <p className="text-2xl font-semibold tracking-tight text-slate-900">{status}</p>
      {!today.is_working_day && <p className="mt-1 text-sm text-slate-500">Today is a weekly off.</p>}

      <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-slate-200 pt-4 text-sm">
        {[
          ["Check-in", formatTime(today.check_in)],
          ["Check-out", formatTime(today.check_out)],
          ["Worked", formatHours(today.hours)],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-slate-500">{label}</dt>
            <dd className="mt-1 font-semibold text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>

      {!done && (
        <button onClick={() => mark(today.check_in ? checkOut : checkIn)} disabled={busy} className={`${BUTTON_PRIMARY} mt-5 w-full`}>
          {busy ? "Please wait..." : today.check_in ? "Check out" : "Check in"}
        </button>
      )}
      {error && (
        <div className="mt-4">
          <ErrorBox message={error} />
        </div>
      )}
    </Card>
  );
}

// Used / pending / available days of one leave type
export function LeaveBalance({ balance }) {
  const share = (days) => `${(Math.max(days, 0) / balance.allowed) * 100}%`;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-slate-900">{balance.name}</p>
        <p className="text-sm text-slate-500">
          <span className="font-semibold text-slate-900">{balance.available}</span> of {balance.allowed} days left
        </p>
      </div>
      <div className="mt-2 flex h-2 gap-0.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        {balance.used > 0 && <span className="rounded-full bg-indigo-600" style={{ width: share(balance.used) }} />}
        {balance.pending > 0 && <span className="rounded-full bg-indigo-300" style={{ width: share(balance.pending) }} />}
      </div>
      <p className="mt-1.5 text-xs text-slate-500">
        {balance.used} used · {balance.pending} pending
      </p>
    </div>
  );
}

// Wraps a page body: spinner on first load, error box on failure
export function Loader({ data, error, children }) {
  if (data) {
    return (
      <>
        {error && (
          <div className="mb-4">
            <ErrorBox message={error} />
          </div>
        )}
        {children}
      </>
    );
  }
  if (error) return <ErrorBox message={error} />;
  return (
    <div className="flex items-center gap-3 py-16 text-sm text-slate-500" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" aria-hidden="true" />
      Loading...
    </div>
  );
}

export const BUTTON_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-60";

export const BUTTON_SECONDARY =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-50";

export const BUTTON_DANGER_TEXT = "text-sm font-semibold text-red-700 hover:text-red-900 disabled:opacity-50";

export const BUTTON_LINK = "text-sm font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50";

// Runs one admin action at a time: `busy` is the key of the action in flight
export function useAction(describeError) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  async function run(key, action) {
    setBusy(key);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(describeError(err));
    }
    setBusy(null);
  }

  return { busy, error, run };
}

// A labelled select over { value, label } options (SelectField in AuthForm takes plain strings)
export function OptionSelect({ label, value, onChange, options, placeholder, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={INPUT_CLASS} {...props}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

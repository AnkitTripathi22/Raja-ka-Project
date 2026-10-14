"use client";

import { useState } from "react";

// Shared layout, inputs and buttons for the login and register pages

const POINTS = [
  "View your complete employee profile in one place",
  "Secure sign-in with encrypted passwords",
  "Department and designation details always at hand",
];

function Logo({ light = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold ${
          light ? "bg-white text-indigo-700" : "bg-indigo-600 text-white"
        }`}
      >
        EP
      </span>
      <span className={`text-lg font-semibold tracking-tight ${light ? "text-white" : "text-slate-900"}`}>
        Employee Portal
      </span>
    </div>
  );
}

// Left: brand panel (large screens only); right: form
export function AuthLayout({ title, subtitle, children }) {
  return (
    <main className="grid flex-1 lg:grid-cols-[5fr_6fr]">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-indigo-400/20 blur-3xl" />

        <div className="relative">
          <Logo light />
        </div>

        <div className="relative">
          <h2 className="max-w-md text-4xl font-semibold leading-tight tracking-tight text-white">
            Manage your workforce from one place.
          </h2>
          <ul className="mt-8 space-y-4">
            {POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3 text-indigo-100">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3 text-white" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-indigo-200/80">© {new Date().getFullYear()} Employee Portal</p>
      </aside>

      <section className="flex items-center justify-center bg-white px-6 py-12 sm:px-12">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <Logo />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </main>
  );
}

// Centered card for smaller pages such as the dashboard
export function AuthCard({ title, children }) {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {children}
      </div>
    </main>
  );
}

export const INPUT_CLASS =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";

export function Field({ label, name, form, setForm, type = "text", ...props }) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";

  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      <span className="relative block">
        <input
          name={name}
          type={isPassword && show ? "text" : type}
          value={form[name]}
          onChange={(e) => setForm({ ...form, [name]: e.target.value })}
          required
          className={`${INPUT_CLASS} ${isPassword ? "pr-16" : ""}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            aria-pressed={show}
            className="absolute inset-y-0 right-0 px-3.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            {show ? "Hide" : "Show"}
          </button>
        )}
      </span>
    </label>
  );
}

export function SelectField({ label, name, form, setForm, options, placeholder = "Select...", ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      <select
        name={name}
        value={form[name]}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        required
        className={`${INPUT_CLASS} ${form[name] ? "" : "text-slate-400"}`}
        {...props}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option} value={option} className="text-slate-900">
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ErrorBox({ message }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm0-12a1 1 0 0 1 1 1v3.5a1 1 0 1 1-2 0V7a1 1 0 0 1 1-1Zm0 8.5a1.1 1.1 0 1 0 0-2.2 1.1 1.1 0 0 0 0 2.2Z"
          clipRule="evenodd"
        />
      </svg>
      <span className="whitespace-pre-line break-words">{message}</span>
    </div>
  );
}

export function SubmitButton({ loading, children }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
      )}
      {loading ? "Please wait..." : children}
    </button>
  );
}

"use client";

import { useCallback, useState } from "react";

import { ErrorBox, Field } from "@/components/AuthForm";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, Card, Loader, PageHeader, StatTile, StatusBadge, formatDate, formatHours, formatTime, useApi } from "@/components/Dashboard";
import { downloadAttendanceReport, getAttendanceReport } from "@/lib/api";

// A local date as "YYYY-MM-DD"
function dateValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// Quick periods, worked out from the browser's date
function presets() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return [
    { label: "This month", from: new Date(year, month, 1), to: now },
    // Day 0 of a month is the last day of the month before it
    { label: "Last month", from: new Date(year, month - 1, 1), to: new Date(year, month, 0) },
    { label: "Last 3 months", from: new Date(year, month - 2, 1), to: now },
  ].map((preset) => ({ label: preset.label, from: dateValue(preset.from), to: dateValue(preset.to) }));
}

export default function ReportsPage() {
  // null loads the default period (the current month up to today)
  const [range, setRange] = useState(null);
  const [form, setForm] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const loader = useCallback(() => getAttendanceReport(range), [range]);
  const { data, error, loading, describeError } = useApi(loader);

  if (!data) return <Loader data={data} error={error} />;

  const { employee, summary, days } = data;
  const shown = { from: data.from, to: data.to };
  // Until the dates are edited, the form shows the period of the report on screen
  const values = form || shown;

  function generate(next) {
    setForm(next);
    setRange({ from: next.from, to: next.to });
  }

  async function download() {
    setDownloading(true);
    setDownloadError("");
    try {
      await downloadAttendanceReport(shown);
    } catch (err) {
      setDownloadError(describeError(err));
    }
    setDownloading(false);
  }

  return (
    <Loader data={data} error={error}>
      <PageHeader title="Attendance report" subtitle={`${formatDate(data.from)} – ${formatDate(data.to)}`}>
        <div className="flex flex-wrap gap-2 print:hidden">
          <button onClick={download} disabled={downloading} className={BUTTON_SECONDARY}>
            {downloading ? "Please wait..." : "Download CSV"}
          </button>
          <button onClick={() => window.print()} className={BUTTON_SECONDARY}>
            Print / Save as PDF
          </button>
        </div>
      </PageHeader>

      {downloadError && (
        <div className="mb-4 print:hidden">
          <ErrorBox message={downloadError} />
        </div>
      )}

      <Card title="Report period" className="print:hidden">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            generate(values);
          }}
          className="grid items-end gap-5 sm:grid-cols-[1fr_1fr_auto]"
        >
          <Field label="From" name="from" type="date" max={values.to} form={values} setForm={setForm} />
          <Field label="To" name="to" type="date" min={values.from} form={values} setForm={setForm} />
          <button type="submit" disabled={loading} className={BUTTON_PRIMARY}>
            {loading ? "Please wait..." : "Generate report"}
          </button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          {presets().map((preset) => (
            <button
              key={preset.label}
              onClick={() => generate(preset)}
              disabled={loading}
              className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </Card>

      <p className="mt-5 text-sm text-slate-600">
        <span className="font-semibold text-slate-900">{employee.name}</span> · {employee.designation} · {employee.department} department
      </p>

      <div className="mt-3 grid grid-cols-2 gap-5 lg:grid-cols-3">
        <StatTile label="Working days" value={summary.working_days} hint="Excludes weekly offs" />
        <StatTile label="Days present" value={summary.present + summary.half_day} hint={summary.half_day ? `Includes ${summary.half_day} half day(s)` : "Full days"} />
        <StatTile label="Days absent" value={summary.absent} />
        <StatTile label="Days on leave" value={summary.leave} />
        <StatTile label="Hours worked" value={formatHours(summary.hours)} hint={summary.average_hours === null ? undefined : `${formatHours(summary.average_hours)} a day on average`} />
        <StatTile label="Attendance" value={summary.attendance_rate === null ? "—" : `${summary.attendance_rate}%`} hint="Present out of present + absent days" />
      </div>

      <Card title="Day by day" className="mt-5">
        <div className="-mx-5 overflow-x-auto sm:-mx-6">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-2 font-medium sm:px-6">Date</th>
                <th className="px-2 py-2 font-medium">Check-in</th>
                <th className="px-2 py-2 font-medium">Check-out</th>
                <th className="px-2 py-2 font-medium">Hours</th>
                <th className="px-5 py-2 font-medium sm:px-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {days.map((day) => (
                <tr key={day.date}>
                  <td className="whitespace-nowrap px-5 py-2.5 font-medium text-slate-900 sm:px-6">
                    {formatDate(day.date, { day: "numeric", month: "short", year: "numeric", weekday: "short" })}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-slate-600">{formatTime(day.check_in)}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-slate-600">{formatTime(day.check_out)}</td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-slate-600">{formatHours(day.hours)}</td>
                  <td className="px-5 py-2.5 sm:px-6">{day.status === "none" ? "—" : <StatusBadge status={day.status} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </Loader>
  );
}

"use client";

import { useCallback, useState } from "react";

import { ErrorBox, INPUT_CLASS } from "@/components/AuthForm";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, Card, Loader, PageHeader, StatTile, StatusBadge, dateValue, formatDate, formatHours, parseDate, useAction, useApi } from "@/components/Dashboard";
import { getAttendanceSheet, saveAttendanceSheet } from "@/lib/api";

const CHOICES = [
  ["present", "Present", "bg-emerald-600 text-white border-emerald-600"],
  ["half_day", "Half day", "bg-amber-500 text-white border-amber-500"],
  ["absent", "Absent", "bg-red-600 text-white border-red-600"],
];

const SMALL_INPUT = `${INPUT_CLASS} !px-2 !py-1.5 disabled:bg-slate-50 disabled:text-slate-400`;

// "2026-10-03" moved by a number of days
function shiftDay(date, by) {
  const day = parseDate(date);
  day.setDate(day.getDate() + by);
  return dateValue(day);
}

// What a row holds before the admin touches it
function saved(row) {
  const status = row.marked && CHOICES.some(([value]) => value === row.status) ? row.status : "unmarked";
  return { status, check_in: row.check_in, check_out: row.check_out, remarks: row.remarks };
}

export default function MarkAttendancePage() {
  // null loads today
  const [date, setDate] = useState(null);
  // Unsaved changes, by employee id
  const [edits, setEdits] = useState({});
  const [savedAt, setSavedAt] = useState(null);
  const loader = useCallback(() => getAttendanceSheet(date), [date]);
  const { data, setData, error, loading, describeError } = useApi(loader);
  const { busy, error: saveError, run } = useAction(describeError);

  if (!data) return <Loader data={data} error={error} />;

  const { rows, summary, today } = data;
  const changed = Object.keys(edits).length;
  const value = (row) => edits[row.employee_id] || saved(row);

  function edit(row, change) {
    setSavedAt(null);
    setEdits({ ...edits, [row.employee_id]: { ...value(row), ...change } });
  }

  function open(next) {
    if (!next || next > today) return;
    if (changed && !window.confirm("You have unsaved changes for this day. Leave without saving?")) return;
    setEdits({});
    setSavedAt(null);
    setDate(next);
  }

  function markAllPresent() {
    const next = { ...edits };
    for (const row of rows) {
      // Employees on approved leave stay on leave
      if (value(row).status === "unmarked" && row.status !== "leave") {
        next[row.employee_id] = { ...value(row), status: "present" };
      }
    }
    setSavedAt(null);
    setEdits(next);
  }

  function save() {
    run("save", async () => {
      const entries = Object.entries(edits).map(([id, entry]) => {
        const timed = entry.status === "present" || entry.status === "half_day";
        return {
          employee_id: Number(id),
          status: entry.status,
          check_in: (timed && entry.check_in) || null,
          check_out: (timed && entry.check_out) || null,
          remarks: entry.remarks || null,
        };
      });
      setData(await saveAttendanceSheet(data.date, entries));
      setEdits({});
      setSavedAt(data.date);
    });
  }

  return (
    <Loader data={data} error={error}>
      <PageHeader
        title="Mark attendance"
        subtitle={`${formatDate(data.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}${data.is_working_day ? "" : " · weekly off"}`}
      >
        <div className="flex items-center gap-2">
          <button onClick={() => open(shiftDay(data.date, -1))} disabled={loading} className={`${BUTTON_SECONDARY} px-3`} aria-label="Previous day">
            ←
          </button>
          <input
            type="date"
            value={data.date}
            max={today}
            onChange={(e) => open(e.target.value)}
            aria-label="Attendance date"
            className={`${INPUT_CLASS} !w-auto`}
          />
          <button onClick={() => open(shiftDay(data.date, 1))} disabled={loading || data.date >= today} className={`${BUTTON_SECONDARY} px-3`} aria-label="Next day">
            →
          </button>
          {data.date !== today && (
            <button onClick={() => open(today)} disabled={loading} className={BUTTON_SECONDARY}>
              Today
            </button>
          )}
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-5">
        <StatTile label="Present" value={summary.present} />
        <StatTile label="Half day" value={summary.half_day} />
        <StatTile label="Absent" value={summary.absent} />
        <StatTile label="On leave" value={summary.leave} />
        <StatTile label="Not marked" value={summary.not_marked} />
      </div>

      <Card
        className="mt-5"
        title={`${rows.length} employee${rows.length === 1 ? "" : "s"}`}
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {savedAt === data.date && !changed && <span className="text-sm font-medium text-emerald-700" role="status">Saved</span>}
            <button onClick={markAllPresent} className={BUTTON_SECONDARY}>
              Mark the rest present
            </button>
            <button onClick={save} disabled={!changed || busy === "save"} className={BUTTON_PRIMARY}>
              {busy === "save" ? "Saving..." : changed ? `Save ${changed} change${changed === 1 ? "" : "s"}` : "Save"}
            </button>
          </div>
        }
      >
        {saveError && (
          <div className="mb-4">
            <ErrorBox message={saveError} />
          </div>
        )}
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">No active employees. Add them from the Employees page.</p>
        ) : (
          <div className="-mx-5 overflow-x-auto sm:-mx-6">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-2 font-medium sm:px-6">Employee</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium">In</th>
                  <th className="px-2 py-2 font-medium">Out</th>
                  <th className="px-5 py-2 font-medium sm:px-6">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => {
                  const entry = value(row);
                  const timed = entry.status === "present" || entry.status === "half_day";
                  return (
                    <tr key={row.employee_id} className={edits[row.employee_id] ? "bg-indigo-50/40" : ""}>
                      <td className="whitespace-nowrap px-5 py-2.5 sm:px-6">
                        <p className="font-medium text-slate-900">{row.name}</p>
                        <p className="text-xs text-slate-500">
                          {[row.designation, row.hours === null ? "" : formatHours(row.hours)].filter(Boolean).join(" · ")}
                        </p>
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex" role="group" aria-label={`Status for ${row.name}`}>
                            {CHOICES.map(([status, label, activeClass], i) => (
                              <button
                                key={status}
                                // Clicking the chosen status again clears the day
                                onClick={() => edit(row, { status: entry.status === status ? "unmarked" : status })}
                                aria-pressed={entry.status === status}
                                className={`whitespace-nowrap border px-3 py-1.5 text-xs font-semibold transition ${i === 0 ? "rounded-l-lg" : "-ml-px"} ${
                                  i === CHOICES.length - 1 ? "rounded-r-lg" : ""
                                } ${entry.status === status ? `relative ${activeClass}` : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                          {entry.status === "unmarked" && (row.status === "leave" || row.status === "weekly_off") && <StatusBadge status={row.status} />}
                        </div>
                      </td>
                      <td className="px-2 py-2.5">
                        <input type="time" value={timed ? entry.check_in : ""} disabled={!timed} onChange={(e) => edit(row, { check_in: e.target.value })} aria-label={`Check-in time for ${row.name}`} className={`${SMALL_INPUT} w-28`} />
                      </td>
                      <td className="px-2 py-2.5">
                        <input type="time" value={timed ? entry.check_out : ""} disabled={!timed} onChange={(e) => edit(row, { check_out: e.target.value })} aria-label={`Check-out time for ${row.name}`} className={`${SMALL_INPUT} w-28`} />
                      </td>
                      <td className="px-5 py-2.5 sm:px-6">
                        <input
                          type="text"
                          value={entry.remarks}
                          maxLength={255}
                          disabled={entry.status === "unmarked"}
                          onChange={(e) => edit(row, { remarks: e.target.value })}
                          placeholder="Optional"
                          aria-label={`Remarks for ${row.name}`}
                          className={`${SMALL_INPUT} min-w-40`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 text-xs text-slate-500">
          Times are optional. Leave is recorded on the Manage leave page and shows here automatically.
        </p>
      </Card>
    </Loader>
  );
}

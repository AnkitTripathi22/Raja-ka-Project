"use client";

import { useCallback, useState } from "react";

import { ErrorBox, Field } from "@/components/AuthForm";
import { BUTTON_LINK, BUTTON_PRIMARY, BUTTON_SECONDARY, Card, LeaveBalance, Loader, OptionSelect, PageHeader, StatTile, StatusBadge, dateValue, formatDate, formatHours, formatTime, useAction, useApi } from "@/components/Dashboard";
import { downloadEmployeeReport, downloadSummaryReport, getAdminEmployees, getEmployeeReport, getSummaryReport } from "@/lib/api";

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
    { label: "This year", from: new Date(year, 0, 1), to: now },
  ].map((preset) => ({ label: preset.label, from: dateValue(preset.from), to: dateValue(preset.to) }));
}

const rate = (value) => (value === null ? "—" : `${value}%`);

function SummaryTable({ rows, onOpen }) {
  const columns = ["Working days", "Present", "Half day", "Absent", "On leave", "Hours", "Attendance"];
  return (
    <Card title="All employees" className="mt-5">
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">No active employees.</p>
      ) : (
        <div className="-mx-5 overflow-x-auto sm:-mx-6">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-2 font-medium sm:px-6">Employee</th>
                {columns.map((column) => (
                  <th key={column} className="px-2 py-2 text-right font-medium">
                    {column}
                  </th>
                ))}
                <th className="px-5 py-2 print:hidden sm:px-6" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="whitespace-nowrap px-5 py-2.5 sm:px-6">
                    <p className="font-medium text-slate-900">{row.name}</p>
                    {row.designation && <p className="text-xs text-slate-500">{row.designation}</p>}
                  </td>
                  {[row.working_days, row.present, row.half_day, row.absent, row.leave, formatHours(row.hours), rate(row.attendance_rate)].map((cell, i) => (
                    <td key={columns[i]} className="whitespace-nowrap px-2 py-2.5 text-right tabular-nums text-slate-700">
                      {cell}
                    </td>
                  ))}
                  <td className="px-5 py-2.5 text-right print:hidden sm:px-6">
                    <button onClick={() => onOpen(row.id)} className={BUTTON_LINK}>
                      View report
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function EmployeeReport({ data }) {
  const { employee, summary, days, leave } = data;
  return (
    <>
      <p className="mt-5 text-sm text-slate-600">
        <span className="font-semibold text-slate-900">{employee.name}</span>
        {[employee.designation, employee.department && `${employee.department} department`].filter(Boolean).map((part) => ` · ${part}`).join("")}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-5 lg:grid-cols-3">
        <StatTile label="Working days" value={summary.working_days} hint="Excludes weekly offs" />
        <StatTile label="Days present" value={summary.present + summary.half_day} hint={summary.half_day ? `Includes ${summary.half_day} half day(s)` : "Full days"} />
        <StatTile label="Days absent" value={summary.absent} />
        <StatTile label="Days on leave" value={summary.leave} />
        <StatTile label="Hours worked" value={formatHours(summary.hours)} hint={summary.average_hours === null ? "From days with in and out times" : `${formatHours(summary.average_hours)} a day on average`} />
        <StatTile label="Attendance" value={rate(summary.attendance_rate)} hint="Present out of present + absent days" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card title={`Leave balance ${leave.year}`} className="xl:self-start">
          <div className="space-y-5">
            {leave.balances.map((balance) => (
              <LeaveBalance key={balance.leave_type_id} balance={balance} />
            ))}
          </div>
        </Card>

        <Card title="Day by day" className="xl:col-span-2">
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
      </div>
    </>
  );
}

export default function EmployeeReportsPage() {
  // "" = the summary of all employees
  const [employeeId, setEmployeeId] = useState("");
  // null loads the default period (the current month up to today)
  const [range, setRange] = useState(null);
  const [form, setForm] = useState(null);
  const { data: employees } = useApi(getAdminEmployees);
  const loader = useCallback(
    () => (employeeId ? getEmployeeReport(employeeId, range) : getSummaryReport(range)),
    [employeeId, range],
  );
  const { data, error, loading, describeError } = useApi(loader);
  const { busy, error: downloadError, run } = useAction(describeError);

  if (!data) return <Loader data={data} error={error} />;

  // While the other kind of report loads, the one on screen stays
  const isSummary = Boolean(data.employees);
  const shown = { from: data.from, to: data.to };
  // Until the dates are edited, the form shows the period of the report on screen
  const values = form || shown;

  function generate(next) {
    setForm(next);
    setRange({ from: next.from, to: next.to });
  }

  function download() {
    run("download", () =>
      isSummary ? downloadSummaryReport(shown) : downloadEmployeeReport(data.employee.id, data.employee.name, shown),
    );
  }

  return (
    <Loader data={data} error={error}>
      <PageHeader title={isSummary ? "Attendance summary" : "Attendance report"} subtitle={`${formatDate(data.from)} – ${formatDate(data.to)}`}>
        <div className="flex flex-wrap gap-2 print:hidden">
          <button onClick={download} disabled={busy !== null} className={BUTTON_SECONDARY}>
            {busy ? "Please wait..." : "Download CSV"}
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

      <Card title="Report" className="print:hidden">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            generate(values);
          }}
          className="grid items-end gap-5 sm:grid-cols-2 xl:grid-cols-[1.5fr_1fr_1fr_auto]"
        >
          <OptionSelect
            label="Employee"
            value={employeeId}
            onChange={setEmployeeId}
            placeholder="All employees (summary)"
            options={(employees || []).filter((employee) => employee.is_active || String(employee.id) === employeeId).map((employee) => ({ value: employee.id, label: employee.name }))}
          />
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

      {isSummary ? <SummaryTable rows={data.employees} onOpen={(id) => setEmployeeId(String(id))} /> : <EmployeeReport data={data} />}
    </Loader>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { BUTTON_SECONDARY, Card, Loader, PageHeader, STATUS, StatTile, StatusBadge, TodayCard, formatDate, formatHours, formatTime, parseDate, useApi } from "@/components/Dashboard";
import { getAttendance } from "@/lib/api";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const LEGEND = ["present", "half_day", "absent", "leave", "weekly_off"];

// "2026-10" moved by a number of months
function shiftMonth(month, by) {
  const [year, number] = month.split("-").map(Number);
  const date = new Date(year, number - 1 + by, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function Calendar({ days, today }) {
  // Monday-first grid: empty cells before the 1st
  const offset = (parseDate(days[0].date).getDay() + 6) % 7;

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-slate-500 sm:gap-2">
        {WEEKDAYS.map((day) => (
          <div key={day} className="pb-1">
            {day}
          </div>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map((day) => {
          const style = STATUS[day.status];
          return (
            <div
              key={day.date}
              title={style ? `${formatDate(day.date)}: ${style.label}` : formatDate(day.date)}
              className={`flex min-h-14 flex-col items-center justify-between rounded-lg border p-1.5 sm:min-h-20 sm:items-start sm:p-2 ${
                day.date === today ? "border-indigo-500 ring-2 ring-indigo-100" : "border-slate-200"
              } ${day.status === "weekly_off" ? "bg-slate-50" : "bg-white"}`}
            >
              <span className={`text-sm font-semibold ${day.status === "none" ? "text-slate-400" : "text-slate-900"}`}>
                {parseDate(day.date).getDate()}
              </span>
              {style && (
                <span className="flex items-center gap-1.5 text-left text-[11px] font-medium leading-tight text-slate-600">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} aria-hidden="true" />
                  <span className="sr-only sm:not-sr-only">{style.label}</span>
                </span>
              )}
            </div>
          );
        })}
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600">
        {LEGEND.map((status) => (
          <li key={status} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${STATUS[status].dot}`} aria-hidden="true" />
            {STATUS[status].label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AttendancePage() {
  const [month, setMonth] = useState(null);
  const loader = useCallback(() => getAttendance(month), [month]);
  const { data, setData, error, loading, describeError } = useApi(loader);

  if (!data) return <Loader data={data} error={error} />;

  const { summary, days, today } = data;
  const currentMonth = today.slice(0, 7);
  const marked = days.filter((day) => day.status !== "none" && day.status !== "weekly_off").reverse();

  return (
    <Loader data={data} error={error}>
      <PageHeader title="Attendance" subtitle="Your daily check-in and check-out record.">
        <div className="flex items-center gap-2">
          <button onClick={() => setMonth(shiftMonth(data.month, -1))} disabled={loading} className={`${BUTTON_SECONDARY} px-3`} aria-label="Previous month">
            ←
          </button>
          <span className="min-w-36 text-center text-sm font-semibold text-slate-900">
            {formatDate(`${data.month}-01`, { month: "long", year: "numeric" })}
          </span>
          <button
            onClick={() => setMonth(shiftMonth(data.month, 1))}
            disabled={loading || data.month >= currentMonth}
            className={`${BUTTON_SECONDARY} px-3`}
            aria-label="Next month"
          >
            →
          </button>
          <Link href="/dashboard/reports" className={BUTTON_SECONDARY}>
            Report
          </Link>
        </div>
      </PageHeader>

      <div className="grid gap-5 lg:grid-cols-3">
        <TodayCard
          today={data.today_record}
          describeError={describeError}
          // Marking changes the month's totals and calendar, so reload the month on screen
          onChange={async () => setData(await getAttendance(data.month))}
        />

        <div className="grid grid-cols-2 gap-5 lg:col-span-2">
          <StatTile label="Days present" value={summary.present + summary.half_day} hint={summary.half_day ? `Includes ${summary.half_day} half day(s)` : "Full days"} />
          <StatTile label="Days absent" value={summary.absent} />
          <StatTile label="Days on leave" value={summary.leave} />
          <StatTile label="Hours worked" value={formatHours(summary.hours)} />
        </div>
      </div>

      <div className="mt-5 grid gap-5 2xl:grid-cols-5">
        <Card title="Calendar" className="2xl:col-span-3">
          <Calendar days={days} today={today} />
        </Card>

        <Card title="Daily log" className="2xl:col-span-2">
          {marked.length === 0 ? (
            <p className="text-sm text-slate-500">No attendance recorded for this month.</p>
          ) : (
            <div className="-mx-5 max-h-[28rem] overflow-auto sm:-mx-6">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-2 font-medium sm:px-6">Date</th>
                    <th className="px-2 py-2 font-medium">In – Out</th>
                    <th className="px-2 py-2 font-medium">Hours</th>
                    <th className="px-5 py-2 font-medium sm:px-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {marked.map((day) => (
                    <tr key={day.date}>
                      <td className="whitespace-nowrap px-5 py-2.5 font-medium text-slate-900 sm:px-6">
                        {formatDate(day.date, { day: "numeric", month: "short", weekday: "short" })}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-slate-600">
                        {day.check_in ? `${formatTime(day.check_in)} – ${formatTime(day.check_out)}` : "—"}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-slate-600">{formatHours(day.hours)}</td>
                      <td className="px-5 py-2.5 sm:px-6">
                        <StatusBadge status={day.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </Loader>
  );
}

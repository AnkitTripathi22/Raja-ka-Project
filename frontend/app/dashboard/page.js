"use client";

import Link from "next/link";
import {
  Avatar,
  Card,
  LeaveBalance,
  Loader,
  PageHeader,
  StatTile,
  StatusBadge,
  TodayCard,
  formatHours,
  useApi,
} from "@/components/Dashboard";
import { getDashboard } from "@/lib/api";

const LINK_CLASS = "text-sm font-semibold text-indigo-600 hover:text-indigo-800";

export default function DashboardPage() {
  const { data, setData, error, describeError } = useApi(getDashboard);

  if (!data) return <Loader data={data} error={error} />;

  const { employee, today, month, leave, department, policies } = data;
  const leaveAvailable = leave.balances.reduce((sum, b) => sum + b.available, 0);
  const departmentPolicies = policies.filter((p) => p.scope === "department").length;

  return (
    <Loader data={data} error={error}>
      <PageHeader
        title={`Welcome, ${employee.first_name}`}
        subtitle={`${employee.designation} · ${department.name} department`}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <TodayCard
          today={today}
          describeError={describeError}
          // The month totals depend on today's record, so reload the lot
          onChange={async () => setData(await getDashboard())}
        />

        <div className="grid grid-cols-2 gap-5 lg:col-span-2">
          <StatTile label="Days present" value={month.present + month.half_day} hint={month.half_day ? `${month.half_day} half day(s) · this month` : "This month"} />
          <StatTile label="Days absent" value={month.absent} hint="This month" />
          <StatTile label="Hours worked" value={formatHours(month.hours)} hint="This month" />
          <StatTile label="Leave available" value={leaveAvailable} hint={leave.pending_requests ? `${leave.pending_requests} request(s) pending` : `Days left in ${leave.year}`} />
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card title={`Leave balance ${leave.year}`} action={<Link href="/dashboard/leave" className={LINK_CLASS}>Apply for leave</Link>}>
          <div className="space-y-5">
            {leave.balances.map((balance) => (
              <LeaveBalance key={balance.leave_type_id} balance={balance} />
            ))}
          </div>
        </Card>

        <Card
          title={`${department.name} department`}
          action={
            <span className="text-sm text-slate-500">
              {department.team_size} member{department.team_size === 1 ? "" : "s"} · {department.on_leave_today} on leave today
            </span>
          }
        >
          <ul className="-my-3 max-h-80 divide-y divide-slate-100 overflow-y-auto">
            {department.team.map((member) => (
              <li key={member.id} className="flex items-center gap-3 py-3">
                <Avatar person={member} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {member.first_name} {member.last_name}
                    {member.is_me && <span className="font-normal text-slate-500"> (you)</span>}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {member.designation} · {member.email}
                  </p>
                </div>
                {member.on_leave_today && <StatusBadge status="leave" />}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card
        className="mt-5"
        title="Policies for you"
        action={<Link href="/dashboard/policies" className={LINK_CLASS}>View all</Link>}
      >
        <p className="-mt-2 mb-4 text-sm text-slate-500">
          {policies.length - departmentPolicies} company-wide · {departmentPolicies} for {department.name}
        </p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {policies.slice(0, 4).map((policy) => (
            <li key={policy.id} className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {policy.scope === "department" ? department.name : "Company"} · {policy.category}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{policy.title}</p>
              <p className="mt-1 text-sm text-slate-600">{policy.summary}</p>
            </li>
          ))}
        </ul>
      </Card>
    </Loader>
  );
}

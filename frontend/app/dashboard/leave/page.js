"use client";

import { useState } from "react";

import { ErrorBox, Field, SelectField, SubmitButton } from "@/components/AuthForm";
import { Card, LeaveBalance, Loader, PageHeader, StatusBadge, formatDate, useApi } from "@/components/Dashboard";
import { applyLeave, cancelLeave, getLeaves } from "@/lib/api";

const EMPTY_FORM = { leave_type: "", start_date: "", end_date: "", reason: "" };

// Today as "YYYY-MM-DD" in the browser's timezone, for the date inputs' min
function todayValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function ApplyForm({ balances, onApplied, describeError }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { leave_type, ...rest } = form;
      const type = balances.find((b) => b.name === leave_type);
      onApplied(await applyLeave({ ...rest, leave_type_id: type.leave_type_id }));
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(describeError(err));
    }
    setLoading(false);
  }

  const field = { form, setForm };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <SelectField label="Leave type" name="leave_type" placeholder="Select leave type" options={balances.map((b) => b.name)} {...field} />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <Field label="From" name="start_date" type="date" min={todayValue()} {...field} />
        <Field label="To" name="end_date" type="date" min={form.start_date || todayValue()} {...field} />
      </div>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-700">Reason</span>
        <textarea
          name="reason"
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
          required
          minLength={3}
          maxLength={500}
          rows={3}
          placeholder="Why do you need this leave?"
          className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
        />
      </label>
      <p className="text-xs text-slate-500">Weekly offs (Saturday, Sunday) inside the dates are not counted as leave days.</p>
      <ErrorBox message={error} />
      <SubmitButton loading={loading}>Apply for leave</SubmitButton>
    </form>
  );
}

export default function LeavePage() {
  const { data, setData, error, describeError } = useApi(getLeaves);
  const [cancelling, setCancelling] = useState(null);
  const [cancelError, setCancelError] = useState("");

  if (!data) return <Loader data={data} error={error} />;

  async function cancel(id) {
    setCancelling(id);
    setCancelError("");
    try {
      setData(await cancelLeave(id));
    } catch (err) {
      setCancelError(describeError(err));
    }
    setCancelling(null);
  }

  return (
    <Loader data={data} error={error}>
      <PageHeader title="Leave" subtitle={`Your leave balance and requests for ${data.year}.`} />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5">
          <Card title="Balance">
            <div className="space-y-5">
              {data.balances.map((balance) => (
                <LeaveBalance key={balance.leave_type_id} balance={balance} />
              ))}
            </div>
          </Card>
          <Card title="Apply for leave">
            <ApplyForm balances={data.balances} onApplied={setData} describeError={describeError} />
          </Card>
        </div>

        <Card title="My requests" className="lg:col-span-2 lg:self-start">
          {cancelError && (
            <div className="mb-4">
              <ErrorBox message={cancelError} />
            </div>
          )}
          {data.requests.length === 0 ? (
            <p className="text-sm text-slate-500">You have not applied for any leave yet.</p>
          ) : (
            <ul className="-my-4 divide-y divide-slate-100">
              {data.requests.map((request) => (
                <li key={request.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 py-4">
                  <div className="min-w-0 flex-1 basis-64">
                    <p className="text-sm font-semibold text-slate-900">
                      {request.leave_type} · {request.days} day{request.days === 1 ? "" : "s"}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-600">
                      {formatDate(request.start_date)}
                      {request.end_date !== request.start_date && ` – ${formatDate(request.end_date)}`}
                    </p>
                    <p className="mt-1 break-words text-sm text-slate-500">{request.reason}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={request.status} />
                    {request.status === "pending" && (
                      <button
                        onClick={() => cancel(request.id)}
                        disabled={cancelling === request.id}
                        className="text-sm font-semibold text-red-700 hover:text-red-900 disabled:opacity-50"
                      >
                        {cancelling === request.id ? "Cancelling..." : "Cancel"}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </Loader>
  );
}

"use client";

import { useState } from "react";

import { ErrorBox, Field, INPUT_CLASS, SubmitButton } from "@/components/AuthForm";
import { BUTTON_DANGER_TEXT, BUTTON_LINK, BUTTON_PRIMARY, BUTTON_SECONDARY, Card, Loader, OptionSelect, PageHeader, StatusBadge, formatDate, useAction, useApi } from "@/components/Dashboard";
import { decideLeave, deleteLeaveType, getAdminLeaves, recordLeave, saveLeaveType } from "@/lib/api";

const EMPTY_FORM = { employee_id: "", leave_type_id: "", start_date: "", end_date: "", reason: "" };

function RecordForm({ data, onSaved, describeError }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      onSaved(
        await recordLeave({
          ...form,
          employee_id: Number(form.employee_id),
          leave_type_id: Number(form.leave_type_id),
        }),
      );
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(describeError(err));
    }
    setLoading(false);
  }

  const field = { form, setForm };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <OptionSelect
        label="Employee"
        value={form.employee_id}
        onChange={(employee_id) => setForm({ ...form, employee_id })}
        options={data.employees.map((employee) => ({ value: employee.employee_id, label: employee.name }))}
        placeholder="Select employee"
        required
      />
      <OptionSelect
        label="Leave type"
        value={form.leave_type_id}
        onChange={(leave_type_id) => setForm({ ...form, leave_type_id })}
        options={data.types.map((type) => ({ value: type.id, label: type.name }))}
        placeholder="Select leave type"
        required
      />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <Field label="From" name="start_date" type="date" {...field} />
        <Field label="To" name="end_date" type="date" min={form.start_date} {...field} />
      </div>
      <Field label="Reason" name="reason" maxLength={500} placeholder="Optional" required={false} {...field} />
      <p className="text-xs text-slate-500">
        Saved as approved straight away; past dates are allowed. Weekly offs (Saturday, Sunday) inside the dates are not counted.
      </p>
      <ErrorBox message={error} />
      <SubmitButton loading={loading}>Record leave</SubmitButton>
    </form>
  );
}

// One editable row per leave type, plus an empty row to add a new one
function LeaveTypeRow({ type, onSaved, describeError }) {
  const [form, setForm] = useState({ name: type?.name || "", days_per_year: type ? String(type.days_per_year) : "" });
  const { busy, error, run } = useAction(describeError);
  const unchanged = type && form.name === type.name && form.days_per_year === String(type.days_per_year);

  function save(e) {
    e.preventDefault();
    run("save", async () => {
      onSaved(await saveLeaveType({ name: form.name, days_per_year: Number(form.days_per_year) }, type?.id));
      if (!type) setForm({ name: "", days_per_year: "" });
    });
  }

  function remove() {
    if (!window.confirm(`Delete the leave type "${type.name}"?`)) return;
    run("delete", async () => onSaved(await deleteLeaveType(type.id)));
  }

  return (
    <li className="py-3">
      <form onSubmit={save} className="flex flex-wrap items-center gap-2">
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          maxLength={50}
          placeholder="New leave type"
          aria-label="Leave type name"
          className={`${INPUT_CLASS} min-w-32 flex-1`}
        />
        <input
          type="number"
          value={form.days_per_year}
          onChange={(e) => setForm({ ...form, days_per_year: e.target.value })}
          required
          min={0}
          max={366}
          placeholder="Days"
          aria-label="Days per year"
          className={`${INPUT_CLASS} !w-20`}
        />
        <button type="submit" disabled={unchanged || busy !== null} className={type ? BUTTON_SECONDARY : BUTTON_PRIMARY}>
          {busy === "save" ? "Saving..." : type ? "Save" : "Add"}
        </button>
        {type && (
          <button type="button" onClick={remove} disabled={busy !== null} className={BUTTON_DANGER_TEXT}>
            Delete
          </button>
        )}
      </form>
      {error && (
        <div className="mt-2">
          <ErrorBox message={error} />
        </div>
      )}
    </li>
  );
}

function RequestItem({ request, busy, decide }) {
  const waiting = busy !== null;
  return (
    <li className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 py-4">
      <div className="min-w-0 flex-1 basis-64">
        <p className="text-sm font-semibold text-slate-900">
          {request.employee_name} · {request.leave_type} · {request.days} day{request.days === 1 ? "" : "s"}
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
          <>
            <button onClick={() => decide(request, "approve")} disabled={waiting} className={BUTTON_LINK}>
              Approve
            </button>
            <button onClick={() => decide(request, "reject")} disabled={waiting} className={BUTTON_DANGER_TEXT}>
              Reject
            </button>
          </>
        )}
        {request.status === "approved" && (
          <button onClick={() => decide(request, "cancel")} disabled={waiting} className={BUTTON_DANGER_TEXT}>
            Cancel
          </button>
        )}
      </div>
    </li>
  );
}

export default function ManageLeavePage() {
  const { data, setData, error, describeError } = useApi(getAdminLeaves);
  const { busy, error: actionError, run } = useAction(describeError);

  if (!data) return <Loader data={data} error={error} />;

  function decide(request, action) {
    if (action === "cancel" && !window.confirm(`Cancel ${request.employee_name}'s approved leave? The days go back to the balance.`)) return;
    run(request.id, async () => setData(await decideLeave(request.id, action)));
  }

  const pending = data.requests.filter((request) => request.status === "pending");
  const decided = data.requests.filter((request) => request.status !== "pending");

  return (
    <Loader data={data} error={error}>
      <PageHeader title="Manage leave" subtitle={`Leave requests, balances and leave types for ${data.year}.`} />

      {actionError && (
        <div className="mb-4">
          <ErrorBox message={actionError} />
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5">
          <Card title="Record leave">
            <RecordForm data={data} onSaved={setData} describeError={describeError} />
          </Card>
          <Card title="Leave types">
            <p className="-mt-2 text-sm text-slate-500">Name and days allowed per year, for every employee.</p>
            <ul className="mt-2 divide-y divide-slate-100">
              {data.types.map((type) => (
                <LeaveTypeRow key={type.id} type={type} onSaved={setData} describeError={describeError} />
              ))}
              <LeaveTypeRow onSaved={setData} describeError={describeError} />
            </ul>
          </Card>
        </div>

        <div className="space-y-5 lg:col-span-2">
          <Card title={`Waiting for approval (${pending.length})`}>
            {pending.length === 0 ? (
              <p className="text-sm text-slate-500">No leave requests are waiting.</p>
            ) : (
              <ul className="-my-4 divide-y divide-slate-100">
                {pending.map((request) => (
                  <RequestItem key={request.id} request={request} busy={busy} decide={decide} />
                ))}
              </ul>
            )}
          </Card>

          <Card title={`Leave balance ${data.year}`}>
            <p className="-mt-2 mb-3 text-sm text-slate-500">Days left out of the yearly allowance. Pending requests hold their days.</p>
            <div className="-mx-5 overflow-x-auto sm:-mx-6">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-2 font-medium sm:px-6">Employee</th>
                    {data.types.map((type) => (
                      <th key={type.id} className="px-2 py-2 text-right font-medium last:pr-5 sm:last:pr-6">
                        {type.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.employees.map((employee) => (
                    <tr key={employee.employee_id}>
                      <td className="whitespace-nowrap px-5 py-2.5 font-medium text-slate-900 sm:px-6">{employee.name}</td>
                      {employee.balances.map((balance) => (
                        <td key={balance.leave_type_id} className="whitespace-nowrap px-2 py-2.5 text-right text-slate-600 last:pr-5 sm:last:pr-6">
                          <span className="font-semibold text-slate-900">{balance.available}</span> / {balance.allowed}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Leave history">
            {decided.length === 0 ? (
              <p className="text-sm text-slate-500">No leave recorded yet.</p>
            ) : (
              <ul className="-my-4 max-h-[32rem] divide-y divide-slate-100 overflow-y-auto">
                {decided.map((request) => (
                  <RequestItem key={request.id} request={request} busy={busy} decide={decide} />
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </Loader>
  );
}

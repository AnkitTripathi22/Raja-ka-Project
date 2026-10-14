"use client";

import { useState } from "react";

import { ErrorBox, Field, SubmitButton } from "@/components/AuthForm";
import { BUTTON_LINK, BUTTON_SECONDARY, Card, Loader, PageHeader, StatusBadge, formatDate, useApi } from "@/components/Dashboard";
import { getAdminEmployees, saveAdminEmployee } from "@/lib/api";

const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  mobile: "",
  email: "",
  department: "",
  designation: "",
  salary: "",
  joined_on: "",
  is_active: true,
};

function formFor(employee) {
  return {
    first_name: employee.first_name,
    last_name: employee.last_name,
    mobile: employee.mobile || "",
    email: employee.email || "",
    department: employee.department,
    designation: employee.designation,
    salary: String(employee.salary),
    joined_on: employee.joined_on || "",
    is_active: employee.is_active,
  };
}

export default function EmployeesPage() {
  const { data: employees, setData, error, describeError } = useApi(getAdminEmployees);
  // null = adding a new employee
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!employees) return <Loader data={employees} error={error} />;

  function startEdit(employee) {
    setEditing(employee);
    setForm(employee ? formFor(employee) : EMPTY_FORM);
    setFormError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      setData(
        await saveAdminEmployee(
          {
            ...form,
            mobile: form.mobile || null,
            email: form.email || null,
            salary: Number(form.salary || 0),
            joined_on: form.joined_on || null,
          },
          editing?.id,
        ),
      );
      startEdit(null);
    } catch (err) {
      setFormError(describeError(err));
    }
    setSaving(false);
  }

  const active = employees.filter((employee) => employee.is_active).length;
  const field = { form, setForm, required: false };

  return (
    <Loader data={employees} error={error}>
      <PageHeader title="Employees" subtitle={`${active} active · ${employees.length - active} inactive`} />

      <div className="grid gap-5 xl:grid-cols-3">
        <Card title="All employees" className="xl:col-span-2 xl:self-start">
          <div className="-mx-5 overflow-x-auto sm:-mx-6">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-2 font-medium sm:px-6">Name</th>
                  <th className="px-2 py-2 font-medium">Contact</th>
                  <th className="px-2 py-2 font-medium">Joined</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-5 py-2 sm:px-6" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((employee) => (
                  <tr key={employee.id} className={editing?.id === employee.id ? "bg-indigo-50/40" : ""}>
                    <td className="px-5 py-2.5 sm:px-6">
                      <p className="font-medium text-slate-900">{employee.name}</p>
                      <p className="text-xs text-slate-500">{[employee.designation, employee.department].filter(Boolean).join(" · ") || "—"}</p>
                    </td>
                    <td className="px-2 py-2.5 text-slate-600">
                      <p>{employee.mobile || "—"}</p>
                      {employee.email && <p className="text-xs text-slate-500">{employee.email}</p>}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2.5 text-slate-600">{formatDate(employee.joined_on)}</td>
                    <td className="px-2 py-2.5">
                      <StatusBadge status={employee.is_active ? "approved" : "cancelled"} label={employee.is_active ? "Active" : "Inactive"} />
                    </td>
                    <td className="px-5 py-2.5 text-right sm:px-6">
                      <button onClick={() => startEdit(employee)} className={BUTTON_LINK}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title={editing ? `Edit ${editing.name}` : "Add employee"} className="xl:self-start">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="First name" name="first_name" maxLength={100} form={form} setForm={setForm} />
              <Field label="Last name" name="last_name" maxLength={100} {...field} />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Mobile" name="mobile" type="tel" pattern="\+?[0-9]{7,14}" title="7 to 14 digits, optionally starting with +" {...field} />
              <Field label="Email" name="email" type="email" maxLength={150} {...field} />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Department" name="department" maxLength={100} {...field} />
              <Field label="Designation" name="designation" maxLength={100} {...field} />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Monthly salary" name="salary" type="number" min={0} step="0.01" {...field} />
              <Field label="Joined on" name="joined_on" type="date" {...field} />
            </div>
            <label className="flex items-start gap-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              <span>
                Active
                <span className="block text-xs text-slate-500">Inactive employees are left out of the attendance sheet and reports. Their records are kept.</span>
              </span>
            </label>
            <p className="text-xs text-slate-500">Only the first name is required. Days before the joining date are not counted as absent.</p>
            <ErrorBox message={formError} />
            <SubmitButton loading={saving}>{editing ? "Save changes" : "Add employee"}</SubmitButton>
            {editing && (
              <button type="button" onClick={() => startEdit(null)} className={`${BUTTON_SECONDARY} w-full`}>
                Cancel
              </button>
            )}
          </form>
        </Card>
      </div>
    </Loader>
  );
}

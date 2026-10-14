"use client";

import { useState } from "react";

import { ErrorBox, Field, INPUT_CLASS, SubmitButton } from "@/components/AuthForm";
import { BUTTON_DANGER_TEXT, BUTTON_LINK, BUTTON_SECONDARY, Card, Loader, PageHeader, StatusBadge, formatDate, useAction, useApi } from "@/components/Dashboard";
import { deleteAdminPolicy, getAdminPolicies, saveAdminPolicy } from "@/lib/api";

const EMPTY_FORM = { title: "", category: "", department: "", summary: "", content: "", effective_from: "", is_active: true };

export default function ManagePoliciesPage() {
  const { data: policies, setData, error, describeError } = useApi(getAdminPolicies);
  // null = adding a new policy
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const { busy, error: deleteError, run } = useAction(describeError);

  if (!policies) return <Loader data={policies} error={error} />;

  function startEdit(policy) {
    setEditing(policy);
    setForm(policy ? { ...EMPTY_FORM, ...policy, department: policy.department || "" } : EMPTY_FORM);
    setFormError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      const { title, category, department, summary, content, effective_from, is_active } = form;
      setData(
        await saveAdminPolicy(
          { title, category, summary, content, is_active, department: department || null, effective_from: effective_from || null },
          editing?.id,
        ),
      );
      startEdit(null);
    } catch (err) {
      setFormError(describeError(err));
    }
    setSaving(false);
  }

  function remove(policy) {
    if (!window.confirm(`Delete the policy "${policy.title}"?`)) return;
    run(policy.id, async () => {
      setData(await deleteAdminPolicy(policy.id));
      if (editing?.id === policy.id) startEdit(null);
    });
  }

  const field = { form, setForm };

  return (
    <Loader data={policies} error={error}>
      <PageHeader title="Manage policies" subtitle="What employees see on their Policies page." />

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-3 xl:col-span-2">
          {deleteError && <ErrorBox message={deleteError} />}
          {policies.length === 0 && (
            <Card>
              <p className="text-sm text-slate-500">No policies yet. Add the first one.</p>
            </Card>
          )}
          {policies.map((policy) => (
            <details key={policy.id} className={`group rounded-2xl border bg-white shadow-sm ${editing?.id === policy.id ? "border-indigo-300" : "border-slate-200"}`}>
              <summary className="flex cursor-pointer list-none flex-wrap items-start justify-between gap-x-4 gap-y-2 p-5 sm:p-6 [&::-webkit-details-marker]:hidden">
                <div className="min-w-0 flex-1 basis-64">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {policy.department || "Company"} · {policy.category}
                  </p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{policy.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{policy.summary}</p>
                </div>
                <div className="flex items-center gap-3">
                  {!policy.is_active && <StatusBadge status="cancelled" label="Hidden" />}
                  {/* preventDefault: a click inside <summary> would also open or close the policy */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      startEdit(policy);
                    }}
                    className={BUTTON_LINK}
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      remove(policy);
                    }}
                    disabled={busy !== null}
                    className={BUTTON_DANGER_TEXT}
                  >
                    Delete
                  </button>
                </div>
              </summary>
              <div className="border-t border-slate-100 px-5 py-4 sm:px-6">
                <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700">
                  {policy.content.split("\n").filter(Boolean).map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-slate-500">Effective from {formatDate(policy.effective_from)}</p>
              </div>
            </details>
          ))}
        </div>

        <Card title={editing ? "Edit policy" : "Add policy"} className="xl:self-start">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Field label="Title" name="title" maxLength={150} placeholder="Leave Policy" {...field} />
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Category" name="category" maxLength={50} placeholder="Leave" {...field} />
              <Field label="Department" name="department" maxLength={100} placeholder="All (company-wide)" required={false} {...field} />
            </div>
            <Field label="Short summary" name="summary" maxLength={300} {...field} />
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Policy text</span>
              <textarea
                name="content"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                required
                rows={7}
                placeholder="One rule per line"
                className={INPUT_CLASS}
              />
            </label>
            <Field label="Effective from" name="effective_from" type="date" required={false} {...field} />
            <label className="flex items-center gap-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              Visible to employees
            </label>
            <ErrorBox message={formError} />
            <SubmitButton loading={saving}>{editing ? "Save changes" : "Add policy"}</SubmitButton>
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

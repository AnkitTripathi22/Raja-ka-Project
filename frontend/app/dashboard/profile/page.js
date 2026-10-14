"use client";

import { useState } from "react";

import { ErrorBox, Field, SubmitButton } from "@/components/AuthForm";
import { Avatar, BUTTON_SECONDARY, Card, Loader, PageHeader, StatusBadge, formatDate, useApi, useMe } from "@/components/Dashboard";
import { getProfile, updateProfile } from "@/lib/api";

function EditForm({ profile, onSaved, onCancel, describeError }) {
  const [form, setForm] = useState({
    first_name: profile.first_name,
    last_name: profile.last_name,
    mobile: profile.mobile,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      onSaved(await updateProfile(form));
    } catch (err) {
      setError(describeError(err));
      setLoading(false);
    }
  }

  const field = { form, setForm };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="First name" name="first_name" autoComplete="given-name" maxLength={100} {...field} />
        <Field label="Last name" name="last_name" autoComplete="family-name" maxLength={100} {...field} />
      </div>
      <Field
        label="Mobile"
        name="mobile"
        type="tel"
        autoComplete="tel"
        pattern="\+?[0-9]{7,14}"
        title="7 to 14 digits, optionally starting with +"
        {...field}
      />
      <p className="text-sm text-slate-500">
        Email, department, designation and salary are managed by HR and cannot be changed here.
      </p>
      <ErrorBox message={error} />
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className={BUTTON_SECONDARY}>
          Cancel
        </button>
        <div className="sm:w-40">
          <SubmitButton loading={loading}>Save changes</SubmitButton>
        </div>
      </div>
    </form>
  );
}

export default function ProfilePage() {
  const { data: profile, setData, error, describeError } = useApi(getProfile);
  const { refresh } = useMe();
  const [editing, setEditing] = useState(false);

  if (!profile) return <Loader data={profile} error={error} />;

  const details = [
    ["Employee ID", `EMP-${String(profile.id).padStart(4, "0")}`],
    ["Email", profile.email],
    ["Mobile", profile.mobile],
    ["Department", profile.department],
    ["Designation", profile.designation],
    ["Joined on", formatDate(profile.joined_on)],
    ["Salary", `₹ ${Number(profile.salary).toLocaleString("en-IN")}`],
  ];

  return (
    <Loader data={profile} error={error}>
      <PageHeader title="My profile" subtitle="Your employee record." />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="flex flex-col items-center text-center lg:self-start">
          <Avatar person={profile} size="h-20 w-20 text-2xl" />
          <p className="mt-4 text-lg font-semibold text-slate-900">
            {profile.first_name} {profile.last_name}
          </p>
          <p className="text-sm text-slate-500">{profile.designation}</p>
          <p className="mb-4 text-sm text-slate-500">{profile.department} department</p>
          {profile.status === false ? <StatusBadge status="cancelled" label="Inactive" /> : <StatusBadge status="approved" label="Active" />}
        </Card>

        <Card
          className="lg:col-span-2"
          title={editing ? "Edit profile" : "Details"}
          action={
            !editing && (
              <button onClick={() => setEditing(true)} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">
                Edit
              </button>
            )
          }
        >
          {editing ? (
            <EditForm
              profile={profile}
              describeError={describeError}
              onCancel={() => setEditing(false)}
              onSaved={(saved) => {
                setData(saved);
                setEditing(false);
                refresh();
              }}
            />
          ) : (
            <dl className="divide-y divide-slate-100 text-sm">
              {details.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 py-3">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="break-all text-right font-medium text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </Card>
      </div>
    </Loader>
  );
}

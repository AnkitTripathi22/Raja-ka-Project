"use client";

import { useState } from "react";

import { Card, Loader, PageHeader, formatDate, useApi, useMe } from "@/components/Dashboard";
import { getPolicies } from "@/lib/api";

export default function PoliciesPage() {
  const { data: policies, error } = useApi(getPolicies);
  const { me } = useMe();
  const [scope, setScope] = useState("all");

  if (!policies) return <Loader data={policies} error={error} />;

  const department = me?.department || "My department";
  const filters = [
    ["all", "All"],
    ["company", "Company"],
    ["department", department],
  ];
  const visible = policies.filter((policy) => scope === "all" || policy.scope === scope);

  return (
    <Loader data={policies} error={error}>
      <PageHeader title="Policies" subtitle="Company-wide policies and the ones specific to your department.">
        <div className="flex gap-1 rounded-lg bg-slate-200/70 p-1" role="group" aria-label="Filter policies">
          {filters.map(([value, label]) => (
            <button
              key={value}
              onClick={() => setScope(value)}
              aria-pressed={scope === value}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                scope === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {label} ({value === "all" ? policies.length : policies.filter((p) => p.scope === value).length})
            </button>
          ))}
        </div>
      </PageHeader>

      {visible.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">No policies here yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((policy) => (
            <details key={policy.id} className="group rounded-2xl border border-slate-200 bg-white shadow-sm">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-5 sm:p-6 [&::-webkit-details-marker]:hidden">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {policy.scope === "department" ? policy.department : "Company"} · {policy.category}
                  </p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{policy.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{policy.summary}</p>
                </div>
                <svg viewBox="0 0 20 20" fill="currentColor" className="mt-1 h-5 w-5 shrink-0 text-slate-400 transition group-open:rotate-180" aria-hidden="true">
                  <path fillRule="evenodd" d="M5.2 7.2a1 1 0 0 1 1.4 0L10 10.6l3.4-3.4a1 1 0 1 1 1.4 1.4l-4.1 4.1a1 1 0 0 1-1.4 0L5.2 8.6a1 1 0 0 1 0-1.4Z" clipRule="evenodd" />
                </svg>
              </summary>
              <div className="border-t border-slate-100 px-5 py-4 sm:px-6">
                <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700">
                  {policy.content.split("\n").filter(Boolean).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-slate-500">Effective from {formatDate(policy.effective_from)}</p>
              </div>
            </details>
          ))}
        </div>
      )}
    </Loader>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Avatar, MeContext } from "@/components/Dashboard";
import { clearToken, getMe, getToken } from "@/lib/api";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: "M3 12 12 3l9 9M5 10v10h5v-6h4v6h5V10" },
  { href: "/dashboard/profile", label: "Profile", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0" },
  { href: "/dashboard/attendance", label: "Attendance", icon: "M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Zm4 10 2 2 4-4" },
  { href: "/dashboard/reports", label: "Reports", icon: "M5 20V10m7 10V4m7 16v-7M3 20h18" },
  { href: "/dashboard/leave", label: "Leave", icon: "M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" },
  { href: "/dashboard/policies", label: "Policies", icon: "M7 3h7l5 5v13H7V3Zm7 0v5h5M10 13h6m-6 4h6" },
];

// Shown only to admins
const ADMIN_NAV = [
  { href: "/dashboard/admin/attendance", label: "Mark attendance", icon: "M9 5h10M9 12h10M9 19h10M4 5l1 1 2-2M4 12l1 1 2-2M4 19l1 1 2-2" },
  { href: "/dashboard/admin/employees", label: "Employees", icon: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0M17 4a4 4 0 0 1 0 7m2 9a7 7 0 0 0-3-6" },
  { href: "/dashboard/admin/leave", label: "Manage leave", icon: "M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" },
  { href: "/dashboard/admin/policies", label: "Manage policies", icon: "M7 3h7l5 5v13H7V3Zm7 0v5h5M10 13h6m-6 4h6" },
  { href: "/dashboard/admin/reports", label: "Employee reports", icon: "M5 20V10m7 10V4m7 16v-7M3 20h18" },
];

function NavLink({ item, active }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
        active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      <NavIcon path={item.icon} />
      {item.label}
    </Link>
  );
}

function NavIcon({ path }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [me, setMe] = useState(null);

  const refresh = useCallback(() => {
    // Pages report their own errors; the shell just shows no name until this succeeds
    getMe()
      .then(setMe)
      .catch((err) => {
        if (err.status === 401) {
          clearToken();
          router.replace("/login");
        }
      });
  }, [router]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setReady(true);
    refresh();
  }, [router, refresh]);

  const isAdmin = me?.role === "admin";

  useEffect(() => {
    if (isAdmin && !me.employee_id && !pathname.startsWith("/dashboard/admin")) {
      router.replace("/dashboard/admin/attendance");
    }
  }, [isAdmin, me, pathname, router]);

  function logout() {
    clearToken();
    router.replace("/login");
  }

  if (!ready) return null;

  return (
    <MeContext.Provider value={{ me, refresh }}>
      <div className="flex min-h-screen flex-1 flex-col lg:flex-row">
        <aside className="print:hidden border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-5 lg:py-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">EP</span>
              <span className="text-lg font-semibold tracking-tight text-slate-900">Employee Portal</span>
            </div>
            <button onClick={logout} className="text-sm font-semibold text-slate-600 hover:text-slate-900 lg:hidden">
              Sign out
            </button>
          </div>

          <nav className="flex gap-1 overflow-x-auto px-3 pb-3 sm:px-5 lg:flex-1 lg:flex-col lg:overflow-visible lg:px-3 lg:pb-0" aria-label="Dashboard">
            {/* An admin login without an employee profile has no pages of its own */}
            {(!me || me.employee_id) && NAV.map((item) => <NavLink key={item.href} item={item} active={pathname === item.href} />)}
            {isAdmin && (
              <>
                <p className="hidden px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-slate-400 lg:block">Admin</p>
                {ADMIN_NAV.map((item) => (
                  <NavLink key={item.href} item={item} active={pathname === item.href} />
                ))}
              </>
            )}
          </nav>

          <div className="hidden border-t border-slate-200 p-4 lg:block">
            {me && (
              <div className="mb-3 flex items-center gap-3">
                <Avatar person={me} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {me.first_name} {me.last_name}
                  </p>
                  <p className="truncate text-xs text-slate-500">{me.department}</p>
                </div>
              </div>
            )}
            <button
              onClick={logout}
              className="w-full rounded-lg border border-slate-300 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </MeContext.Provider>
  );
}

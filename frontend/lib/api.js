const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const TOKEN_KEY = "access_token";

// FastAPI errors: detail is either a string or a list of validation errors
function errorMessage(data) {
  const detail = data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((e) => `${e.loc[e.loc.length - 1]}: ${e.msg}`).join("\n");
  }
  return "Something went wrong. Please try again.";
}

// Resolves with the response, or throws an Error carrying the HTTP status
async function send(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, options);
  } catch {
    throw new Error("Unable to reach the server. Please try again later.");
  }
  if (!res.ok) {
    const error = new Error(errorMessage(await res.json().catch(() => null)));
    error.status = res.status;
    throw error;
  }
  return res;
}

async function request(path, options = {}) {
  const res = await send(path, options);
  return res.json().catch(() => null);
}

function post(path, body) {
  return request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function registerUser(form) {
  return post("/api/auth/register", { ...form, salary: Number(form.salary) });
}

export function loginUser(form) {
  return post("/api/auth/login", form);
}

// Signed-in requests: a 401 means the token is missing, invalid or expired
function authed(path, { method = "GET", body } = {}) {
  const headers = { Authorization: `Bearer ${getToken()}` };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  return request(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
}

export function getMe() {
  return authed("/api/auth/me");
}

export function getDashboard() {
  return authed("/api/employee/dashboard");
}

export function getProfile() {
  return authed("/api/employee/profile");
}

export function updateProfile(form) {
  return authed("/api/employee/profile", { method: "PUT", body: form });
}

// month: "YYYY-MM"; the current month when omitted
export function getAttendance(month) {
  return authed(`/api/employee/attendance${month ? `?month=${month}` : ""}`);
}

export function checkIn() {
  return authed("/api/employee/attendance/check-in", { method: "POST" });
}

export function checkOut() {
  return authed("/api/employee/attendance/check-out", { method: "POST" });
}

// range: { from, to } as "YYYY-MM-DD"; the current month up to today when omitted
function rangeQuery(range) {
  return range ? `?from=${range.from}&to=${range.to}` : "";
}

export function getAttendanceReport(range) {
  return authed(`/api/employee/attendance/report${rangeQuery(range)}`);
}

// Saves a CSV file (a plain link cannot send the Authorization header)
async function download(path, filename) {
  const res = await send(path, { headers: { Authorization: `Bearer ${getToken()}` } });
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadAttendanceReport(range) {
  return download(
    `/api/employee/attendance/report/csv${rangeQuery(range)}`,
    `attendance-report_${range.from}_to_${range.to}.csv`,
  );
}

export function getLeaves() {
  return authed("/api/employee/leaves");
}

export function applyLeave(form) {
  return authed("/api/employee/leaves", { method: "POST", body: form });
}

export function cancelLeave(id) {
  return authed(`/api/employee/leaves/${id}/cancel`, { method: "POST" });
}

export function getPolicies() {
  return authed("/api/employee/policies");
}

// Admin: these work on any employee and need the admin role

export function getAdminEmployees() {
  return authed("/api/admin/employees");
}

// id: the employee to update; a new employee when omitted
export function saveAdminEmployee(form, id) {
  return authed(`/api/admin/employees${id ? `/${id}` : ""}`, { method: id ? "PUT" : "POST", body: form });
}

// date: "YYYY-MM-DD"; today when omitted
export function getAttendanceSheet(date) {
  return authed(`/api/admin/attendance${date ? `?date=${date}` : ""}`);
}

export function saveAttendanceSheet(date, entries) {
  return authed("/api/admin/attendance", { method: "PUT", body: { date, entries } });
}

export function getAdminLeaves() {
  return authed("/api/admin/leaves");
}

export function recordLeave(form) {
  return authed("/api/admin/leaves", { method: "POST", body: form });
}

// action: "approve", "reject" or "cancel"
export function decideLeave(id, action) {
  return authed(`/api/admin/leaves/${id}/${action}`, { method: "POST" });
}

export function saveLeaveType(form, id) {
  return authed(`/api/admin/leave-types${id ? `/${id}` : ""}`, { method: id ? "PUT" : "POST", body: form });
}

export function deleteLeaveType(id) {
  return authed(`/api/admin/leave-types/${id}`, { method: "DELETE" });
}

export function getAdminPolicies() {
  return authed("/api/admin/policies");
}

export function saveAdminPolicy(form, id) {
  return authed(`/api/admin/policies${id ? `/${id}` : ""}`, { method: id ? "PUT" : "POST", body: form });
}

export function deleteAdminPolicy(id) {
  return authed(`/api/admin/policies/${id}`, { method: "DELETE" });
}

export function getSummaryReport(range) {
  return authed(`/api/admin/reports/summary${rangeQuery(range)}`);
}

export function downloadSummaryReport(range) {
  return download(
    `/api/admin/reports/summary/csv${rangeQuery(range)}`,
    `attendance-summary_${range.from}_to_${range.to}.csv`,
  );
}

export function getEmployeeReport(id, range) {
  return authed(`/api/admin/reports/employee/${id}${rangeQuery(range)}`);
}

export function downloadEmployeeReport(id, name, range) {
  return download(
    `/api/admin/reports/employee/${id}/csv${rangeQuery(range)}`,
    `attendance-report_${name.replace(/\s+/g, "-")}_${range.from}_to_${range.to}.csv`,
  );
}

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

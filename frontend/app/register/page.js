"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthLayout, ErrorBox, Field, SelectField, SubmitButton } from "@/components/AuthForm";
import { registerUser, saveToken } from "@/lib/api";

const DEPARTMENTS = [
  "IT",
  "Human Resources",
  "Finance",
  "Accounts",
  "Sales",
  "Marketing",
  "Operations",
  "Customer Support",
  "Administration",
  "Legal",
  "Research & Development",
  "Quality Assurance",
  "Product",
  "Design",
  "Procurement",
  "Logistics",
];

const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  email: "",
  mobile: "",
  department: "",
  designation: "",
  salary: "",
  password: "",
  admin_code: "",
};

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await registerUser(form);
      saveToken(data.access_token);
      router.push("/dashboard");
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  const field = { form, setForm };

  return (
    <AuthLayout title="Create your account" subtitle="Fill in your details to get started.">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="First name" name="first_name" placeholder="first name " autoComplete="given-name" maxLength={100} {...field} />
          <Field label="Last name" name="last_name" placeholder="last name" autoComplete="family-name" maxLength={100} {...field} />
        </div>
        <Field label="Email" name="email" type="email" placeholder="you@company.com" autoComplete="email" {...field} />
        <Field
          label="Mobile"
          name="mobile"
          type="tel"
          placeholder="+919876543210"
          autoComplete="tel"
          pattern="\+?[0-9]{7,14}"
          title="7 to 14 digits, optionally starting with +"
          {...field}
        />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <SelectField label="Department" name="department" placeholder="Select department" options={DEPARTMENTS} {...field} />
          <Field label="Designation" name="designation" placeholder="Developer" maxLength={100} {...field} />
        </div>
      
        <Field
          label="Password"
          name="password"
          type="password"
          minLength={6}
          maxLength={64}
          placeholder="At least 6 characters"
          autoComplete="new-password"
          {...field}
        />
        {/* Left empty, the account is a normal employee */}
        <Field
          label="Admin code (optional)"
          name="admin_code"
          type="password"
          required={false}
          maxLength={64}
          placeholder="Only if you are registering as an admin"
          autoComplete="off"
          {...field}
        />
        <ErrorBox message={error} />
        <SubmitButton loading={loading}>Create account</SubmitButton>
      </form>
      <p className="mt-8 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-800">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

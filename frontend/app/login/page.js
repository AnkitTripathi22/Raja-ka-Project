"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthLayout, ErrorBox, Field, SubmitButton } from "@/components/AuthForm";
import { loginUser, saveToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await loginUser(form);
      saveToken(data.access_token);
      router.push("/dashboard");
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Enter your credentials to access your account.">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field
          label="Email"
          name="email"
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
          form={form}
          setForm={setForm}
        />
        <Field
          label="Password"
          name="password"
          type="password"
          minLength={6}
          placeholder="Enter your password"
          autoComplete="current-password"
          form={form}
          setForm={setForm}
        />
        <ErrorBox message={error} />
        <SubmitButton loading={loading}>Sign in</SubmitButton>
      </form>
      <p className="mt-8 text-center text-sm text-slate-500">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-semibold text-indigo-600 hover:text-indigo-800">
          Create one
        </Link>
      </p>
    </AuthLayout>
  );
}

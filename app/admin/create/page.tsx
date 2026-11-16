"use client";

import { FormEvent, useState } from "react";
import { logout } from "@/app/actions/auth";
import { createOperator, createResponder } from "@/app/actions/admin";

type Result = { success: true; message: string } | { success: false; error: string };

type Field = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  minLength?: number;
};

const card: React.CSSProperties = {
  maxWidth: "460px",
  width: "100%",
  margin: "0 auto",
  padding: "24px",
  border: "1px solid #e5e5e5",
  borderRadius: "10px",
  background: "#fff",
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #ccc",
  borderRadius: "6px",
  fontSize: "15px",
  boxSizing: "border-box",
};

const label: React.CSSProperties = {
  display: "block",
  marginBottom: "6px",
  fontSize: "14px",
  fontWeight: 600,
};

const button: React.CSSProperties = {
  padding: "11px",
  background: "#0070f3",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "15px",
  fontWeight: 600,
};

function AccountForm({
  title,
  description,
  fields,
  action,
  buttonLabel,
}: {
  title: string;
  description: string;
  fields: Field[];
  action: (formData: FormData) => Promise<Result>;
  buttonLabel: string;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setLoading(true);
    setResult(null);

    const res = await action(new FormData(form));

    setLoading(false);
    setResult(res);
    if (res.success) form.reset();
  }

  return (
    <section style={card}>
      <h2 style={{ margin: "0 0 4px" }}>{title}</h2>
      <p style={{ color: "#666", fontSize: "14px", margin: "0 0 20px" }}>{description}</p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {fields.map((f) => (
          <div key={f.name}>
            <label htmlFor={`${title}-${f.name}`} style={label}>
              {f.label}
              {f.required && <span style={{ color: "#e00" }}> *</span>}
            </label>
            <input
              id={`${title}-${f.name}`}
              name={f.name}
              type={f.type ?? "text"}
              required={f.required}
              minLength={f.minLength}
              style={input}
            />
          </div>
        ))}

        <button type="submit" disabled={loading} style={{ ...button, opacity: loading ? 0.7 : 1 }}>
          {loading ? "Creating..." : buttonLabel}
        </button>
      </form>

      {result && !result.success && (
        <p style={{ color: "#c00", background: "#fee", padding: "10px", borderRadius: "6px", marginTop: "14px" }}>
          {result.error}
        </p>
      )}
      {result?.success && (
        <p style={{ color: "#070", background: "#efe", padding: "10px", borderRadius: "6px", marginTop: "14px" }}>
          {result.message}
        </p>
      )}
    </section>
  );
}

const operatorFields: Field[] = [
  { name: "email", label: "Email", type: "email", required: true },
  { name: "username", label: "Username (optional)" },
  { name: "password", label: "Temporary password", type: "password", required: true, minLength: 8 },
];

const responderFields: Field[] = [
  { name: "email", label: "Email", type: "email", required: true },
  { name: "first_name", label: "First name", required: true },
  { name: "middle_name", label: "Middle name (optional)" },
  { name: "surname", label: "Surname", required: true },
  { name: "branch", label: "Branch", required: true },
  { name: "password", label: "Temporary password", type: "password", required: true, minLength: 8 },
];

export default function CreateAccountsPage() {
  return (
    <main style={{ padding: "40px 16px", background: "#f6f6f6", minHeight: "100vh" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <AccountForm
          title="Create Operator"
          description="Creates a login with the operator role."
          fields={operatorFields}
          action={createOperator}
          buttonLabel="Create Operator"
        />

        <AccountForm
          title="Create Responder"
          description="Creates a login with the responder role and a responder profile."
          fields={responderFields}
          action={createResponder}
          buttonLabel="Create Responder"
        />

        <div style={{ textAlign: "center" }}>
          <button
            onClick={() => logout()}
            style={{ ...button, background: "#e00", padding: "10px 20px" }}
          >
            Logout
          </button>
        </div>
      </div>
    </main>
  );
}
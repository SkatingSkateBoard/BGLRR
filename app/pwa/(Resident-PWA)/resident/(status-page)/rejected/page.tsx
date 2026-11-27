"use client";

import { useEffect, useState } from "react";
import StatusScreen from "@/components/resident-comps/status-screen";
import { logout } from "@/app/actions/auth";
import {
  getRejectionReasonAction,
  type RejectionResult,
} from "@/app/actions/rejection-actions";

export default function RejectedResidentPage() {
  const [result, setResult] = useState<RejectionResult | null>(null);

  useEffect(() => {
    getRejectionReasonAction().then(setResult);
  }, []);

  const reasonContent = !result
    ? "Loading..."
    : result.error
      ? <span role="alert" className="font-medium text-red-700">{result.error}</span>
      : result.reason ?? "No reason was recorded.";

  return (
    <StatusScreen
      tone="rejected"
      title="Account not approved"
      actionLabel="Return to login"
      actionHref="/resident/login"
      footer={
        <button
          type="button"
          onClick={() => logout("resident")}
          className="mt-6 w-full rounded-2xl bg-red-600 py-4 text-base font-extrabold text-white active:translate-y-0.5"
        >
          Log out
        </button>
      }
    >
      <p>Your account was not approved by the BPSO.</p>
      <p className="mt-3 rounded-2xl bg-white px-4 py-3 text-left shadow-[inset_0_2px_4px_rgba(0,0,0,0.08)]">
        <span className="block text-xs font-extrabold text-red-700">Reason</span>
        {reasonContent}
      </p>
    </StatusScreen>
  );
}
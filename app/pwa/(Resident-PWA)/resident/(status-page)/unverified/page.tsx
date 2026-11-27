"use client";

import { logout } from "@/app/actions/auth";
import StatusScreen from "@/components/resident-comps/status-screen";

export default function UnverifiedResidentPage() {
  return (
    <StatusScreen
      tone="pending"
      title="Your account is awaiting verification"
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
      <p>Your account has not yet been verified by the BPSO.</p>
      <p className="mt-2">
        Please check back later. You can use the app once an operator approves your account.
      </p>
    </StatusScreen>
  );
}
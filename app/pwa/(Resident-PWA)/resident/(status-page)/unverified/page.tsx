'use client';

import StatusScreen from "@/components/resident-comps/status-screen";

export default function UnverifiedResidentPage() {
  return (
    <StatusScreen tone="pending" title="Your account is awaiting verification">
      <p>Your account has not yet been verified by the BPSO.</p>
      <p className="mt-2">
        Please check back later. You can use the app once an operator approves your account.
      </p>
    </StatusScreen>
  );
}
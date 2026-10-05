"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {isResidentVerified} from "@/app/actions/auth";
import ReportingDashboard from "@/components/resident-comps/reporting-page";


type verificationStatus = "verified" | "pending" | "rejected" | null;

export default function ReportingPage() {
  const router = useRouter();
  const [isVerified, setIsVerified] = useState<verificationStatus>(null);

  useEffect(() => {
    const checkVerification = async () => {
      const result = await isResidentVerified();
      if (result.success && result.status === "pending") {
        router.push("/resident/unverified");
      } else if (result.success && result.status === "rejected") {
        router.push("/resident/rejected");
      } else if (!result.success) {
        router.push("/resident/login");
      }

      setIsVerified(result.status);
    };

    checkVerification();
  }, [router]);

  if (isVerified !== "verified") {
    return null;
  }

  return (
    <ReportingDashboard/>
  );
}
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { isResidentVerified } from "@/app/actions/auth";
import { getActiveEmergencyCall } from "@/app/actions/resident";
import { createClient } from "@/utils/supabase/client";
import ReportingDashboard from "@/components/resident-comps/reporting-page";
import { ResidentPushBanner } from "@/components/resident-comps/resident-push-banner";

type VerificationStatus = "verified" | "pending" | "rejected" | null;

type ActiveEmergency = {
  emergency: { id: number; status: string; category: string; created_at: string };
  roomId: string;
  livekitToken: string;
};

export default function ReportingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [isVerified, setIsVerified] = useState<VerificationStatus>(null);
  const [isLocationBlocked, setIsLocationBlocked] = useState(false);
  const [isInstalledApp, setIsInstalledApp] = useState(false);

  const [checkingActive, setCheckingActive] = useState(true);
  const [activeEmergency, setActiveEmergency] = useState<ActiveEmergency | null>(null);
  const [rejoining, setRejoining] = useState(false);
  const lastPingRef = useRef<number>(0);

  useEffect(() => {
    const checkVerification = async () => {
      const result = await isResidentVerified();
      if (result.success && result.status === "pending") {
        router.push("/pwa/resident/unverified");
      } else if (result.success && result.status === "rejected") {
        router.push("/pwa/resident/rejected");
      } else if (!result.success) {
        router.push("/pwa/resident/login");
      }

      setIsVerified(result.status);
    };

    checkVerification();
  }, [router]);

  useEffect(() => {
    if (isVerified !== "verified") return;

    const installed =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsInstalledApp(installed);

    if (!navigator.geolocation) {
      setIsLocationBlocked(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => setIsLocationBlocked(false),
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setIsLocationBlocked(true);
        }
      },
      { enableHighAccuracy: true }
    );

    if (navigator.permissions) {
      navigator.permissions.query({ name: "geolocation" }).then((status) => {
        status.onchange = () => {
          setIsLocationBlocked(status.state === "denied");
        };
      });
    }
  }, [isVerified]);

  // Check if resident already has an active (non-resolved) emergency
  useEffect(() => {
    if (isVerified !== "verified") return;

    let mounted = true;
    getActiveEmergencyCall().then((data) => {
      if (!mounted) return;
      setActiveEmergency(data);
      setCheckingActive(false);
    });

    return () => {
      mounted = false;
    };
  }, [isVerified]);

  // Unlock dashboard automatically when 'resolved' or deleted by operator
  useEffect(() => {
    const emergencyId = activeEmergency?.emergency?.id;
    if (!emergencyId) return;

    const channel = supabase
      .channel(`resident-active-req-${emergencyId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tbl_emergency_req", filter: `id=eq.${emergencyId}` },
        (payload) => {
          const newStatus = payload.new?.status;
          if (newStatus === "resolved") {
            setActiveEmergency(null);
          } else if (newStatus) {
            setActiveEmergency((prev) =>
              prev ? { ...prev, emergency: { ...prev.emergency, status: newStatus } } : null
            );
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "tbl_emergency_req", filter: `id=eq.${emergencyId}` },
        () => setActiveEmergency(null)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeEmergency?.emergency?.id, supabase]);

  // Keep real-time GPS tracking running while resident stays on this screen
  useEffect(() => {
    const emergencyId = activeEmergency?.emergency?.id;
    if (!emergencyId || isLocationBlocked || !("geolocation" in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const now = Date.now();
        if (now - lastPingRef.current < 5000) return;
        lastPingRef.current = now;

        await supabase
          .from("tbl_emergency_req")
          .update({
            current_latitude: pos.coords.latitude,
            current_longitude: pos.coords.longitude,
            updated_at: new Date().toISOString(),
          })
          .eq("id", emergencyId);
      },
      (err) => console.error("Dashboard GPS watch error:", err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [activeEmergency?.emergency?.id, isLocationBlocked, supabase]);

  if (isVerified !== "verified" || checkingActive) {
    return null;
  }

  if (isLocationBlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="max-w-md w-full bg-white border border-red-200 rounded-2xl shadow-sm p-6 text-center space-y-5">
          <div className="mx-auto w-14 h-14 rounded-full bg-red-100 flex items-center justify-center text-red-600">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-gray-900">Location Access Needed</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              {"You can't access the emergency dashboard right now because location permissions are turned off. Responders need your GPS location to send help immediately."}
            </p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-left space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">How to turn it back on:</p>
            {isInstalledApp ? (
              <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                <li>{"Press and hold the "}<strong>BGLRR</strong>{" app icon on your home screen and tap "}<strong>App info</strong>{" (or open your phone's "}<strong>{"Settings > Apps"}</strong>{" and find "}<strong>BGLRR</strong>{")."}</li>
                <li>{"Open "}<strong>{"Permissions > Location"}</strong>{" (or "}<strong>Site settings</strong>{")."}</li>
                <li>{"Set "}<strong>Location</strong>{" to "}<strong>Allow</strong>{"."}</li>
              </ol>
            ) : (
              <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                <li>{"Tap the "}<strong>:</strong> icon {" above to the website address at the top of your screen."}</li>
                <li>{"Select "}<strong>Site Controls</strong> then <strong>Permissions</strong>{"."}</li>
                <li>{"Change "}<strong>Location</strong>{" to "}<strong>Allowed</strong>{"."}</li>
              </ol>
            )}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2.5 px-4 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition"
          >
            {"I've Enabled Location — Refresh"}
          </button>
        </div>
      </div>
    );
  }

  if (activeEmergency) {
    const handleRejoinCall = async () => {
      setRejoining(true);
      const fresh = await getActiveEmergencyCall();
      if (!fresh) {
        setActiveEmergency(null);
        setRejoining(false);
        return;
      }
      router.push(`/pwa/resident/call/${fresh.roomId}?token=${encodeURIComponent(fresh.livekitToken)}`);
    };

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="max-w-md w-full bg-white border border-red-200 rounded-2xl shadow-sm p-6 text-center space-y-5">
          <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-red-100 text-red-700">
            Request #{activeEmergency.emergency.id} • {activeEmergency.emergency.status}
          </span>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-gray-900">Emergency Response in Progress</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              <strong>Please do not leave or close the app.</strong>{" "}
              We are tracking your real-time location until your emergency is resolved.
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 font-medium">
            New emergency requests are disabled while this response is active.
          </div>
          <button
            type="button"
            disabled={rejoining}
            onClick={handleRejoinCall}
            className="w-full py-3.5 px-4 bg-[rgb(237,41,44)] hover:bg-red-700 disabled:bg-gray-400 text-white text-base font-bold rounded-xl shadow-md transition cursor-pointer"
          >
            {rejoining ? "Connecting to Call..." : "Rejoin Emergency Call"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <ResidentPushBanner />
      <ReportingDashboard />
    </>
  );
}

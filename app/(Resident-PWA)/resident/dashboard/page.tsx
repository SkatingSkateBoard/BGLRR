  "use client";

  import { useState, useEffect } from "react";
  import { useRouter } from "next/navigation";
  import { isResidentVerified } from "@/app/actions/auth";
  import ReportingDashboard from "@/components/resident-comps/reporting-page";
  import { ResidentPushBanner } from "@/components/resident-comps/resident-push-banner";
  type VerificationStatus = "verified" | "pending" | "rejected" | null;

  export default function ReportingPage() {
    const router = useRouter();
    const [isVerified, setIsVerified] = useState<VerificationStatus>(null);
    const [isLocationBlocked, setIsLocationBlocked] = useState(false);
    const [isInstalledApp, setIsInstalledApp] = useState(false);

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

    if (isVerified !== "verified") {
      return null;
    }

    if (isLocationBlocked) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
          <div className="max-w-md w-full bg-white border border-red-200 rounded-2xl shadow-sm p-6 text-center space-y-5">
            <div className="mx-auto w-14 h-14 rounded-full bg-red-100 flex items-center justify-center text-red-600">
              <svg
                className="w-7 h-7"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
              </svg>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-gray-900">
                Location Access Needed
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                {"You can't access the emergency dashboard right now because location permissions are turned off. Responders need your GPS location to send help immediately."}
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-left space-y-2.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                How to turn it back on:
              </p>

              {isInstalledApp ? (
                <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                  <li>
                    {"Press and hold the "}<strong>BGLRR</strong>{" app icon on your home screen and tap "}<strong>App info</strong>{" (or open your phone's "}<strong>{"Settings > Apps"}</strong>{" and find "}<strong>BGLRR</strong>{")."}
                  </li>
                  <li>
                    {"Open "}<strong>{"Permissions > Location"}</strong>{" (or "}<strong>Site settings</strong>{")."}
                  </li>
                  <li>
                    {"Set "}<strong>Location</strong>{" to "}<strong>Allow</strong>{"."}
                  </li>
                </ol>
              ) : (
                <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                  <li>
                    {"Tap the "}<strong>:</strong> icon {" above to the website address at the top of your screen."}
                  </li>
                  <li>
                    {"Select "}<strong>Site Controls</strong> then <strong>Permissions</strong>{"."}
                  </li>
                  <li>
                    {"Change "}<strong>Location</strong>{" to "}<strong>Allowed</strong>{"."}
                  </li>
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

    return (
      <>
        <ResidentPushBanner />
        <ReportingDashboard />
      </>
    );
  }

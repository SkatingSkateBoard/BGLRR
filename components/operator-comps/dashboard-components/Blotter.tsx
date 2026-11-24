"use client";

import * as React from "react";
import {
  CalendarClock,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  FileText,
  AlertCircle,
} from "lucide-react";
import {
  getBlottersAction,
  scheduleBlotterAction,
  rejectBlotterAction,
  completeBlotterAction,
} from "@/app/actions/blotter-actions";
import type { BlotterRow, BlotterStatus } from "@/app/actions/blotter-actions";

type ActiveTab = "all" | BlotterStatus;

const MANILA_TZ = "Asia/Manila";

const statusStyles: Record<
  BlotterStatus,
  { bg: string; text: string; border: string; icon: React.ReactNode; label: string }
> = {
  pending: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    icon: <Clock size={12} />,
    label: "Pending",
  },
  scheduled: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    icon: <CalendarClock size={12} />,
    label: "Scheduled",
  },
  rejected: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    icon: <XCircle size={12} />,
    label: "Rejected",
  },
  completed: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    icon: <CheckCircle2 size={12} />,
    label: "Completed",
  },
};

/** Converts an ISO string into the "YYYY-MM-DDTHH:mm" value a datetime-local input expects, in the browser's local time. */
function toLocalInputFormat(isoString: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

/** Formats an ISO timestamp as e.g. "Nov 25, 2026, 02:30 PM", always in Manila time. */
function formatManilaDateTime(isoString: string | null): string {
  if (!isoString) return "—";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    timeZone: MANILA_TZ,
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function BlotterScreen() {
  const [activeTab, setActiveTab] = React.useState<ActiveTab>("all");
  const [blotters, setBlotters] = React.useState<BlotterRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Scheduling state
  const [schedulingId, setSchedulingId] = React.useState<number | null>(null);
  const [scheduledDateTime, setScheduledDateTime] = React.useState("");
  const [isScheduling, setIsScheduling] = React.useState(false);

  // Rejection state
  const [rejectingId, setRejectingId] = React.useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = React.useState("");
  const [isRejecting, setIsRejecting] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    getBlottersAction().then((rows) => {
      if (cancelled) return;
      setBlotters(rows);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredBlotters = blotters.filter((blotter) =>
    activeTab === "all" ? true : blotter.blotter_status === activeTab
  );

  const getTabCount = (tabId: ActiveTab) =>
    tabId === "all"
      ? blotters.length
      : blotters.filter((b) => b.blotter_status === tabId).length;

  /** Merges server data into the existing row so joined `resident` is preserved. */
  const mergeUpdatedRow = (updated: BlotterRow) =>
    setBlotters((prev) =>
      prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
    );

  // ---- Scheduling ----

  const handleScheduleOpen = (blotter: BlotterRow) => {
    setRejectingId(null);
    setSchedulingId(blotter.id);
    if (blotter.appointment_date) {
      setScheduledDateTime(toLocalInputFormat(blotter.appointment_date));
    } else {
      const soon = new Date(Date.now() + 30 * 60 * 1000);
      setScheduledDateTime(toLocalInputFormat(soon.toISOString()));
    }
  };

  const handleScheduleClose = () => {
    setSchedulingId(null);
    setScheduledDateTime("");
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (schedulingId === null || !scheduledDateTime) return;

    setIsScheduling(true);
    try {
      const res = await scheduleBlotterAction({
        id: schedulingId,
        appointmentDate: scheduledDateTime,
      });

      if (!res.success) {
        alert(`Could not schedule appointment: ${res.error}`);
        return;
      }

      mergeUpdatedRow(res.data);
      handleScheduleClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      alert(`Could not schedule appointment: ${message}`);
    } finally {
      setIsScheduling(false);
    }
  };

  // ---- Rejection ----

  const handleRejectOpen = (blotter: BlotterRow) => {
    setSchedulingId(null);
    setRejectingId(blotter.id);
    setRejectionReason(blotter.rejection_reason ?? "");
  };

  const handleRejectClose = () => {
    setRejectingId(null);
    setRejectionReason("");
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const reason = rejectionReason.trim();
    if (rejectingId === null || !reason) return;

    setIsRejecting(true);
    try {
      const res = await rejectBlotterAction({
        id: rejectingId,
        rejectionReason: reason,
      });

      if (!res.success) {
        alert(`Could not reject blotter: ${res.error}`);
        return;
      }

      mergeUpdatedRow(res.data);
      handleRejectClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      alert(`Could not reject blotter: ${message}`);
    } finally {
      setIsRejecting(false);
    }
  };

  // ---- Completion ----

  const handleComplete = async (id: number) => {
    if (!confirm("Mark this blotter as completed?")) return;
    try {
      const res = await completeBlotterAction(id);

      if (!res.success) {
        alert(`Could not complete blotter: ${res.error}`);
        return;
      }

      mergeUpdatedRow(res.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      alert(`Could not complete blotter: ${message}`);
    }
  };

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: "all", label: "All", icon: <FileText size={14} /> },
    { id: "pending", label: "Pending", icon: <Clock size={14} /> },
    { id: "scheduled", label: "Scheduled", icon: <CalendarClock size={14} /> },
    { id: "rejected", label: "Rejected", icon: <XCircle size={14} /> },
    { id: "completed", label: "Completed", icon: <CheckCircle2 size={14} /> },
  ];

  return (
    <div className="flex flex-col h-full w-full p-6 gap-6 overflow-y-auto">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-100 border border-amber-200">
            <CalendarClock size={24} className="text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Blotter Appointments</h2>
            <p className="text-xs text-gray-500">
              Schedule, review, and manage blotter appointments
            </p>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          {blotters.length} total blotter{blotters.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* TABS */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-colors ${
              activeTab === tab.id
                ? "bg-[rgb(35,35,184)]/10 border-[rgb(35,35,184)] text-[rgb(35,35,184)]"
                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-gray-100 text-gray-600">
              {getTabCount(tab.id)}
            </span>
          </button>
        ))}
      </div>

      {/* TABLE HEADER — spans sum to 12 */}
      <div className="grid grid-cols-12 items-center bg-white rounded-lg border border-gray-200/80 px-5 py-2.5 text-xs font-semibold text-gray-500">
        <div className="col-span-1">ID</div>
        <div className="col-span-2">Resident</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2">Appointment</div>
        <div className="col-span-3">Details</div>
        <div className="col-span-1">Created</div>
        <div className="col-span-1 text-right">Actions</div>
      </div>

      {/* TABLE BODY */}
      <div className="flex flex-col gap-2 overflow-y-auto pr-1 flex-1 min-h-0">
        {isLoading ? (
          <div className="bg-white rounded-xl border border-gray-200/80 p-8 text-center text-sm text-gray-400">
            Loading blotter appointments...
          </div>
        ) : filteredBlotters.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200/80 p-8 text-center text-sm text-gray-400">
            No {activeTab === "all" ? "" : activeTab} blotter appointments found.
          </div>
        ) : (
          filteredBlotters.map((blotter) => {
            const status = blotter.blotter_status;
            const style = statusStyles[status];
            const isSchedulingThis = schedulingId === blotter.id;
            const isRejectingThis = rejectingId === blotter.id;
            const residentName = blotter.resident
              ? `${blotter.resident.first_name} ${blotter.resident.last_name}`
              : `Resident ID: ${blotter.resident_id}`;

            return (
              <div
                key={blotter.id}
                className={`bg-white rounded-xl border px-5 py-3.5 text-sm transition-colors ${
                  isSchedulingThis || isRejectingThis
                    ? "border-amber-400 bg-amber-50/40"
                    : "border-gray-200/80 hover:border-gray-300"
                }`}
              >
                <div className="grid grid-cols-12 items-center">
                  <div className="col-span-1 text-xs font-mono text-gray-500">#{blotter.id}</div>

                  <div className="col-span-2">
                    <div className="font-medium text-gray-800">{residentName}</div>
                    {blotter.resident?.phone && (
                      <div className="text-xs text-gray-400">{blotter.resident.phone}</div>
                    )}
                  </div>

                  <div className="col-span-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${style.bg} ${style.text} ${style.border}`}
                    >
                      {style.icon}
                      {style.label}
                    </span>
                  </div>

                  <div className="col-span-2 text-xs font-medium text-gray-600">
                    {formatManilaDateTime(blotter.appointment_date)}
                  </div>

                  <div className="col-span-3 text-xs text-gray-500 truncate pr-4">
                    {status === "rejected" && blotter.rejection_reason
                      ? blotter.rejection_reason
                      : blotter.description || (
                          <span className="italic text-gray-300">No details provided</span>
                        )}
                  </div>

                  <div className="col-span-1 text-xs text-gray-400">
                    {formatManilaDateTime(blotter.created_at)}
                  </div>

                  <div className="col-span-1 flex justify-end gap-1.5">
                    {(status === "pending" || status === "scheduled" || status === "rejected") && (
                      <button
                        type="button"
                        onClick={() => handleScheduleOpen(blotter)}
                        title={status === "pending" ? "Schedule appointment" : "Reschedule appointment"}
                        className="p-2 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 cursor-pointer"
                      >
                        <Calendar size={14} />
                      </button>
                    )}
                    {(status === "pending" || status === "scheduled") && (
                      <button
                        type="button"
                        onClick={() => handleRejectOpen(blotter)}
                        title="Reject with reason"
                        className="p-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 cursor-pointer"
                      >
                        <XCircle size={14} />
                      </button>
                    )}
                    {status === "scheduled" && (
                      <button
                        type="button"
                        onClick={() => handleComplete(blotter.id)}
                        title="Mark as completed"
                        className="p-2 rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                      >
                        <CheckCircle2 size={14} />
                      </button>
                    )}
                    {status === "completed" && (
                      <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                        <CheckCircle2 size={14} />
                      </span>
                    )}
                  </div>
                </div>

                {/* SCHEDULE FORM */}
                {isSchedulingThis && (
                  <form
                    onSubmit={handleScheduleSubmit}
                    className="mt-3 pt-3 border-t border-amber-200 grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
                  >
                    <div className="md:col-span-2 text-xs text-gray-500">
                      <div className="font-semibold uppercase tracking-wider mb-1.5 text-gray-600">
                        Resident details
                      </div>
                      <p className="whitespace-pre-wrap">
                        {blotter.description || "No details provided"}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                        Date &amp; Time
                      </label>
                      <input
                        type="datetime-local"
                        required
                        value={scheduledDateTime}
                        onChange={(e) => setScheduledDateTime(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div className="md:col-span-3 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleScheduleClose}
                        className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 text-sm font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isScheduling}
                        className="px-4 py-2 rounded-lg bg-amber-600 text-white font-medium text-sm hover:bg-amber-700 disabled:opacity-50"
                      >
                        {isScheduling ? "Scheduling..." : "Schedule Appointment"}
                      </button>
                    </div>
                  </form>
                )}

                {/* REJECT FORM */}
                {isRejectingThis && (
                  <form
                    onSubmit={handleRejectSubmit}
                    className="mt-3 pt-3 border-t border-red-200 grid grid-cols-1 md:grid-cols-3 gap-4"
                  >
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                        Rejection Reason <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        required
                        rows={2}
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Enter reason for rejection..."
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-red-500 focus:outline-none resize-none"
                      />
                    </div>
                    <div className="md:col-span-3 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleRejectClose}
                        className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 text-sm font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isRejecting}
                        className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium text-sm hover:bg-red-700 disabled:opacity-50"
                      >
                        {isRejecting ? "Rejecting..." : "Reject Blotter"}
                      </button>
                    </div>
                  </form>
                )}

                {/* REJECTION REASON DISPLAY */}
                {status === "rejected" && blotter.rejection_reason && !isRejectingThis && (
                  <div className="mt-2 pt-2 border-t border-red-100 rounded-lg p-3 bg-red-50/30">
                    <div className="flex items-center gap-1.5 text-xs text-red-700">
                      <AlertCircle size={12} />
                      <span className="font-semibold">Rejection Reason:</span>
                      <span>{blotter.rejection_reason}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
"use client";

import * as React from "react";
import { Megaphone, Send, Clock, Calendar, CheckCircle2, Trash2, Pencil, X } from "lucide-react";
import {
  AnnouncementRow,
  getAnnouncementsAction,
  createAnnouncementAction,
  updateAnnouncementAction,
  deleteAnnouncementAction,
} from "@/app/actions/announcement-actions";

type ReleaseMode = "immediate" | "scheduled";
type Tab = "published" | "scheduled";

const REFRESH_MS = 30_000;

// Converts a stored UTC ISO string into the value a datetime-local input expects (local clock time).
const toLocalInputFormat = (isoString: string) => {
  const date = new Date(isoString);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

const formatDate = (isoString: string) =>
  new Date(isoString).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

export function AnnouncementsScreen() {
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [releaseMode, setReleaseMode] = React.useState<ReleaseMode>("immediate");
  const [scheduledDateTime, setScheduledDateTime] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<Tab>("published");

  const [announcements, setAnnouncements] = React.useState<AnnouncementRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const isEditing = editingId !== null;
  const editingItem = announcements.find((a) => a.id === editingId) ?? null;
  // Once pushed, the release date and sending are fixed. Title and message stay editable.
  const isLocked = editingItem?.isPushed ?? false;

  // Load on mount, then refresh so cron-published rows move to Published on their own.
  React.useEffect(() => {
    let active = true;

    const load = () =>
      getAnnouncementsAction()
        .then((rows) => {
          if (active) setAnnouncements(rows);
        })
        .catch((err) => console.error("Failed to load announcements:", errorMessage(err)))
        .finally(() => {
          if (active) setIsLoading(false);
        });

    load();
    const id = setInterval(load, REFRESH_MS);

    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setScheduledDateTime("");
    setReleaseMode("immediate");
  };

  const handleStartEdit = (item: AnnouncementRow) => {
    setEditingId(item.id);
    setTitle(item.title);
    setDescription(item.description);

    if (!item.isPushed && item.isScheduled) {
      setReleaseMode("scheduled");
      setScheduledDateTime(toLocalInputFormat(item.scheduled_at));
    } else {
      setReleaseMode("immediate");
      setScheduledDateTime("");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    if (!trimmedTitle || !trimmedDescription) return;
    if (!isLocked && releaseMode === "scheduled" && !scheduledDateTime) return;

    // Convert the picker value to UTC once, here. Immediate posts use the current time.
    const schedule =
      releaseMode === "scheduled"
        ? { isScheduled: true, scheduledAt: new Date(scheduledDateTime).toISOString() }
        : { isScheduled: false, scheduledAt: new Date().toISOString() };

    setIsSubmitting(true);
    try {
      if (isEditing) {
        // Published posts send only title and description. The server ignores schedule fields for them too.
        const updated = await updateAnnouncementAction({
          id: editingId,
          title: trimmedTitle,
          description: trimmedDescription,
          ...(isLocked ? {} : schedule),
        });
        setAnnouncements((prev) => prev.map((item) => (item.id === editingId ? updated : item)));
        resetForm();
      } else {
        const created = await createAnnouncementAction({
          title: trimmedTitle,
          description: trimmedDescription,
          ...schedule,
        });
        setAnnouncements((prev) => [created, ...prev]);
        setActiveTab(schedule.isScheduled ? "scheduled" : "published");
        resetForm();
      }
    } catch (err) {
      console.error("Failed to save announcement:", errorMessage(err));
      alert("Could not save announcement: " + errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this announcement?")) return;
    try {
      await deleteAnnouncementAction(id);
      setAnnouncements((prev) => prev.filter((item) => item.id !== id));
      if (editingId === id) resetForm();
    } catch (err) {
      console.error("Failed to delete announcement:", errorMessage(err));
      alert("Could not delete announcement: " + errorMessage(err));
    }
  };

  // isPushed is the source of truth. It is set on immediate posts and by the cron job.
  const publishedList = announcements.filter((a) => a.isPushed);
  const scheduledList = announcements.filter((a) => !a.isPushed);
  const visibleList = activeTab === "published" ? publishedList : scheduledList;

  return (
    <div className="flex flex-col h-full w-full p-6 gap-6 overflow-y-auto">
      {/* CREATE / EDIT FORM */}
      <div
        className={`rounded-2xl border-2 shadow-sm p-6 transition-all duration-200 ${
          isEditing
            ? "bg-amber-50/40 border-amber-400 ring-4 ring-amber-400/15"
            : "bg-white border-gray-200/80"
        }`}
      >
        {isEditing && (
          <div className="flex items-center justify-between bg-amber-100 border border-amber-300 text-amber-900 px-4 py-2 rounded-xl mb-4 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>EDITING MODE — Modifying Announcement #{editingId}</span>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="flex items-center gap-1 bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
            >
              <X size={13} /> Cancel Edit
            </button>
          </div>
        )}

        <div className="flex items-center gap-2.5 mb-4">
          <div
            className={`p-2 rounded-lg ${
              isEditing ? "bg-amber-500/15 text-amber-700" : "bg-[rgb(35,35,184)]/10 text-[rgb(35,35,184)]"
            }`}
          >
            {isEditing ? <Pencil size={20} /> : <Megaphone size={20} />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {isEditing ? "Edit Barangay Announcement" : "Create Barangay Announcement"}
            </h2>
            <p className="text-xs text-gray-500">
              {isEditing
                ? isLocked
                  ? "Already published. You can edit the title and message, but not the release schedule."
                  : "Update the message or change when it is released"
                : "Broadcast urgent advisories immediately or schedule for later"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div>
              <label htmlFor="announcement-title" className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                Announcement Title
              </label>
              <input
                id="announcement-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Heavy Rainfall Warning / Road Closure Advisory"
                className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-[rgb(35,35,184)] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="announcement-description" className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                Description / Message Body
              </label>
              <textarea
                id="announcement-description"
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Write the full details residents will receive..."
                className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-[rgb(35,35,184)] focus:outline-none resize-none"
              />
            </div>
          </div>

          <div className="flex flex-col justify-between bg-white/80 rounded-xl border border-gray-200/80 p-4 gap-4">
            {isLocked ? (
              <div className="flex flex-col gap-2">
                <span className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">Release Schedule</span>
                <p className="text-xs text-gray-500">
                  Sent on {formatDate(editingItem!.scheduled_at)}. The release schedule can't be changed.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <span className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">Release Schedule</span>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReleaseMode("immediate")}
                    aria-pressed={releaseMode === "immediate"}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold border cursor-pointer ${
                      releaseMode === "immediate"
                        ? "bg-[rgb(35,35,184)] text-white border-[rgb(35,35,184)]"
                        : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
                    }`}
                  >
                    <Send size={14} /> Push Now
                  </button>
                  <button
                    type="button"
                    onClick={() => setReleaseMode("scheduled")}
                    aria-pressed={releaseMode === "scheduled"}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold border cursor-pointer ${
                      releaseMode === "scheduled"
                        ? "bg-[rgb(35,35,184)] text-white border-[rgb(35,35,184)]"
                        : "bg-white text-gray-600 border-gray-300 hover:bg-gray-100"
                    }`}
                  >
                    <Clock size={14} /> Schedule
                  </button>
                </div>

                {releaseMode === "scheduled" ? (
                  <div className="mt-1">
                    <label htmlFor="announcement-datetime" className="block text-xs font-medium text-gray-600 mb-1">
                      Select Date & Time
                    </label>
                    <input
                      id="announcement-datetime"
                      type="datetime-local"
                      required
                      min={toLocalInputFormat(new Date().toISOString())}
                      value={scheduledDateTime}
                      onChange={(e) => setScheduledDateTime(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-[rgb(35,35,184)] focus:outline-none"
                    />
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">Published and pushed to residents immediately upon submission.</p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full flex items-center justify-center gap-2 text-white font-semibold text-sm py-2.5 px-4 rounded-lg cursor-pointer disabled:opacity-50 transition-colors ${
                isEditing ? "bg-amber-600 hover:bg-amber-700" : "bg-[rgb(35,35,184)] hover:bg-[rgb(28,28,155)]"
              }`}
            >
              {isSubmitting ? (
                "Saving..."
              ) : isEditing ? (
                <>
                  <CheckCircle2 size={16} /> Save Changes
                </>
              ) : releaseMode === "immediate" ? (
                <>
                  <Send size={16} /> Publish Announcement
                </>
              ) : (
                <>
                  <Calendar size={16} /> Schedule Announcement
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* TABS & TABLE */}
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center gap-6 border-b border-gray-200 px-2 mb-3">
          {(["published", "scheduled"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`pb-2.5 text-sm font-semibold border-b-2 cursor-pointer capitalize ${
                activeTab === tab ? "border-[rgb(35,35,184)] text-[rgb(35,35,184)]" : "border-transparent text-gray-500"
              }`}
            >
              {tab} ({tab === "published" ? publishedList.length : scheduledList.length})
            </button>
          ))}
        </div>

        <div className="grid grid-cols-12 items-center bg-white rounded-lg border border-gray-200/80 px-5 py-2.5 text-xs font-semibold text-gray-500 mb-2">
          <div className="col-span-2">Release Date</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-3">Title</div>
          <div className="col-span-4">Description</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        <div className="flex flex-col gap-2 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="bg-white rounded-xl border border-gray-200/80 p-8 text-center text-sm text-gray-400">
              Loading announcements...
            </div>
          ) : visibleList.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200/80 p-8 text-center text-sm text-gray-400">
              No {activeTab} announcements yet.
            </div>
          ) : (
            visibleList.map((item) => {
              const isBeingEdited = editingId === item.id;
              return (
                <div
                  key={item.id}
                  className={`grid grid-cols-12 items-center bg-white rounded-xl border px-5 py-3.5 text-sm transition-colors ${
                    isBeingEdited ? "border-amber-400 bg-amber-50/40" : "border-gray-200/80"
                  }`}
                >
                  <div className="col-span-2 text-xs font-medium text-gray-600">{formatDate(item.scheduled_at)}</div>
                  <div className="col-span-2">
                    {item.isPushed ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500 text-white">
                        <CheckCircle2 size={12} /> Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500 text-white">
                        <Clock size={12} /> Scheduled
                      </span>
                    )}
                  </div>
                  <div className="col-span-3 font-semibold text-gray-800 truncate pr-3">{item.title}</div>
                  <div className="col-span-4 text-xs text-gray-500 truncate pr-4">{item.description}</div>
                  <div className="col-span-1 flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(item)}
                      title="Edit announcement"
                      className="p-2 rounded-lg border border-blue-200 text-[rgb(35,35,184)] hover:bg-blue-50 cursor-pointer"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      title="Delete announcement"
                      className="p-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
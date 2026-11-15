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

export function AnnouncementsScreen() {
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [releaseMode, setReleaseMode] = React.useState<ReleaseMode>("immediate");
  const [scheduledDateTime, setScheduledDateTime] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<"published" | "scheduled">("published");

  const [announcements, setAnnouncements] = React.useState<AnnouncementRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    getAnnouncementsAction().then((rows) => {
      setAnnouncements(rows);
      setIsLoading(false);
    });
  }, []);

  const toLocalInputFormat = (isoString: string) => {
    const date = new Date(isoString);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  };

  const handleStartEdit = (item: AnnouncementRow) => {
    setEditingId(item.id);
    setTitle(item.title);
    setDescription(item.description);

    const isFuture = new Date(item.scheduled_at) > new Date();
    if (isFuture || item.isScheduled) {
      setReleaseMode("scheduled");
      setScheduledDateTime(toLocalInputFormat(item.scheduled_at));
    } else {
      setReleaseMode("immediate");
      setScheduledDateTime("");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setScheduledDateTime("");
    setReleaseMode("immediate");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    if (releaseMode === "scheduled" && !scheduledDateTime) return;

    setIsSubmitting(true);

    try {
      if (editingId !== null) {
        const updated = await updateAnnouncementAction({
          id: editingId,
          title: title.trim(),
          description: description.trim(),
          isScheduled: releaseMode === "scheduled",
          scheduledAt: scheduledDateTime,
        });

        setAnnouncements((prev) =>
          prev.map((item) => (item.id === editingId ? updated : item))
        );
      } else {
        const created = await createAnnouncementAction({
          title: title.trim(),
          description: description.trim(),
          isScheduled: releaseMode === "scheduled",
          scheduledAt: scheduledDateTime,
        });

        setAnnouncements((prev) => [created, ...prev]);
      }

      setActiveTab(releaseMode === "immediate" ? "published" : "scheduled");
      handleCancelEdit();
    } catch (err: any) {
      console.error("Failed to save announcement:", err.message);
      alert("Could not save announcement: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteAnnouncementAction(id);
      setAnnouncements((prev) => prev.filter((item) => item.id !== id));
      if (editingId === id) handleCancelEdit();
    } catch (err: any) {
      console.error("Failed to delete announcement:", err.message);
      alert("Could not delete announcement: " + err.message);
    }
  };

  const now = new Date();
  const publishedList = announcements.filter((a) => new Date(a.scheduled_at) <= now);
  const scheduledList = announcements.filter((a) => new Date(a.scheduled_at) > now);
  const visibleList = activeTab === "published" ? publishedList : scheduledList;

  const formatDate = (isoString: string) =>
    new Date(isoString).toLocaleString("en-PH", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    return (
    <div className="flex flex-col h-full w-full p-6 gap-6 overflow-y-auto">
      {/* TOP CARD: CREATE / EDIT ANNOUNCEMENT FORM */}
      <div
        className={`rounded-2xl border-2 shadow-sm p-6 transition-all duration-200 ${
          editingId !== null
            ? "bg-amber-50/40 border-amber-400 ring-4 ring-amber-400/15"
            : "bg-white border-gray-200/80"
        }`}
      >
        {/* Prominent Editing Banner */}
        {editingId !== null && (
          <div className="flex items-center justify-between bg-amber-100 border border-amber-300 text-amber-900 px-4 py-2 rounded-xl mb-4 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>EDITING MODE — Modifying Announcement #{editingId}</span>
            </div>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="flex items-center gap-1 bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
            >
              <X size={13} /> Cancel Edit
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg ${
                editingId !== null
                  ? "bg-amber-500/15 text-amber-700"
                  : "bg-[rgb(35,35,184)]/10 text-[rgb(35,35,184)]"
              }`}
            >
              {editingId !== null ? <Pencil size={20} /> : <Megaphone size={20} />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {editingId !== null ? "Edit Barangay Announcement" : "Create Barangay Announcement"}
              </h2>
              <p className="text-xs text-gray-500">
                {editingId !== null
                  ? "Update the message details or reschedule its release time below"
                  : "Broadcast urgent advisories immediately or schedule for later"}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                Announcement Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Heavy Rainfall Warning / Road Closure Advisory"
                className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-[rgb(35,35,184)] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                Description / Message Body
              </label>
              <textarea
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
            <div className="flex flex-col gap-3">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Release Schedule
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setReleaseMode("immediate")}
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
                  <label className="block text-xs font-medium text-gray-600 mb-1">Select Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={scheduledDateTime}
                    onChange={(e) => setScheduledDateTime(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-[rgb(35,35,184)] focus:outline-none"
                  />
                </div>
              ) : (
                <p className="text-xs text-gray-500 mt-1">
                  Published and pushed to residents immediately upon submission.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full flex items-center justify-center gap-2 text-white font-semibold text-sm py-2.5 px-4 rounded-lg cursor-pointer disabled:opacity-50 transition-colors ${
                editingId !== null
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-[rgb(35,35,184)] hover:bg-[rgb(28,28,155)]"
              }`}
            >
              {isSubmitting ? (
                "Saving..."
              ) : editingId !== null ? (
                <><CheckCircle2 size={16} /> Save Changes</>
              ) : releaseMode === "immediate" ? (
                <><Send size={16} /> Publish Announcement</>
              ) : (
                <><Calendar size={16} /> Schedule Announcement</>
              )}
            </button>
          </div>
        </form>
      </div>
      {/* BOTTOM SECTION: TABS & ANNOUNCEMENTS TABLE */}
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center gap-6 border-b border-gray-200 px-2 mb-3">
          <button
            type="button"
            onClick={() => setActiveTab("published")}
            className={`pb-2.5 text-sm font-semibold border-b-2 cursor-pointer ${
              activeTab === "published" ? "border-[rgb(35,35,184)] text-[rgb(35,35,184)]" : "border-transparent text-gray-500"
            }`}
          >
            Published ({publishedList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("scheduled")}
            className={`pb-2.5 text-sm font-semibold border-b-2 cursor-pointer ${
              activeTab === "scheduled" ? "border-[rgb(35,35,184)] text-[rgb(35,35,184)]" : "border-transparent text-gray-500"
            }`}
          >
            Scheduled ({scheduledList.length})
          </button>
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
              const isPublished = new Date(item.scheduled_at) <= now;
              const isBeingEdited = editingId === item.id;
              return (
                <div
                  key={item.id}
                  className={`grid grid-cols-12 items-center bg-white rounded-xl border px-5 py-3.5 text-sm transition-colors ${
                    isBeingEdited ? "border-amber-400 bg-amber-50/40" : "border-gray-200/80"
                  }`}
                >
                  <div className="col-span-2 text-xs font-medium text-gray-600">
                    {formatDate(item.scheduled_at)}
                  </div>
                  <div className="col-span-2">
                    {isPublished ? (
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

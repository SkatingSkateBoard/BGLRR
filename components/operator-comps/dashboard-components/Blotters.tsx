"use client";

import { useState, useSyncExternalStore } from "react";
import { ClipboardList, MapPin, Search } from "lucide-react";
import {
  getBlotterReportsSnapshot,
  notifyBlotterReportsChanged,
  subscribeToBlotterReports,
} from "@/lib/blotterReports";

function formatReceivedAt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function BlottersScreen() {
  const snapshot = useSyncExternalStore(
    subscribeToBlotterReports,
    getBlotterReportsSnapshot,
    getBlotterReportsSnapshot,
  );
  const reports = snapshot.reports;
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredReports = reports.filter((report) =>
    [
      report.id,
      report.concernType,
      report.concern,
      report.location,
      report.requestedHelp,
    ].some((value) => value.toLowerCase().includes(normalizedQuery)),
  );
  const selectedReport =
    filteredReports.find((report) => report.id === selectedId) ??
    filteredReports[0] ??
    null;

  return (
    <main className="min-h-screen bg-slate-50/70 p-6 text-slate-800">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-1.5 text-indigo-900 text-xs font-semibold uppercase tracking-wider">
              <ClipboardList className="h-4 w-4" />
              Resident Reports
            </div>
            <h1 className="mt-0.5 text-xl font-bold text-slate-900">
              Blotter Reports ({filteredReports.length})
            </h1>
          </div>

          <div className="flex w-full gap-2 sm:w-auto">
            <label className="relative min-w-0 flex-1 sm:w-80">
              <span className="sr-only">Search blotter reports</span>
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search reports..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-700 focus:bg-white focus:outline-none"
              />
            </label>
            <button
              type="button"
              onClick={notifyBlotterReportsChanged}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>
        </header>

        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Frontend preview: reports are stored in this browser only and are not
          synced to a server.
        </p>

        {snapshot.error && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {snapshot.error}
          </p>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm lg:col-span-7">
            <div className="border-b border-slate-200 px-5 py-3">
              <h2 className="font-semibold text-slate-900">Received Reports</h2>
            </div>
            {filteredReports.length === 0 ? (
              <p className="px-5 py-16 text-center text-sm text-slate-500">
                {reports.length === 0
                  ? "No blotter reports have been submitted in this browser."
                  : "No reports match your search."}
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filteredReports.map((report) => {
                  const isSelected = selectedReport?.id === report.id;
                  return (
                    <li key={report.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(report.id)}
                        aria-pressed={isSelected}
                        className={`w-full px-5 py-4 text-left transition-colors ${
                          isSelected
                            ? "border-l-4 border-indigo-900 bg-indigo-50/80"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="font-semibold text-slate-900">
                            {report.concernType}
                          </span>
                          <span className="shrink-0 text-xs text-slate-500">
                            {formatReceivedAt(report.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                          {report.concern}
                        </p>
                        {report.location && (
                          <span className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500">
                            <MapPin className="h-3.5 w-3.5" />
                            {report.location}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="lg:col-span-5">
            {selectedReport ? (
              <article className="space-y-5 rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm lg:sticky lg:top-6">
                <header className="border-b border-slate-100 pb-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-bold text-slate-900">
                      {selectedReport.concernType}
                    </h2>
                    <span className="rounded-md bg-indigo-900 px-2.5 py-1 text-xs font-semibold text-white">
                      Received
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Report {selectedReport.id} ·{" "}
                    {formatReceivedAt(selectedReport.createdAt)}
                  </p>
                </header>

                <div className="space-y-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Concern
                  </h3>
                  <p className="whitespace-pre-wrap text-sm text-slate-800">
                    {selectedReport.concern}
                  </p>
                </div>

                <div className="space-y-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Location
                  </h3>
                  <p className="text-sm text-slate-800">
                    {selectedReport.location || "No location provided."}
                  </p>
                </div>

                <div className="space-y-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Requested help
                  </h3>
                  <p className="whitespace-pre-wrap text-sm text-slate-800">
                    {selectedReport.requestedHelp}
                  </p>
                </div>
              </article>
            ) : (
              <div className="rounded-xl border border-slate-200/80 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
                Select a report to view its details.
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

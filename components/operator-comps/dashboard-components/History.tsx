"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  FileText,
  PhoneCall,
  CheckCircle2,
  User,
  ShieldAlert,
  Calendar,
  MessageSquare,
  ClipboardEdit,
  Search,
} from "lucide-react";

type TranscriptTurn = {
  role: string;
  text: string;
  start: number;
  end: number;
};

type EmergencyResultRow = {
  id: number;
  resident_id: number;
  emergency_req_id: number;
  operator_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  audio_path: string | null;
  summary: string | null;
  call_transcript: TranscriptTurn[] | null;
};

function formatTime(sec: number) {
  const mins = Math.floor(sec / 60);
  const secs = Math.floor(sec % 60);
  return mins + ":" + secs.toString().padStart(2, "0");
}
export function HistoryPage() {
  const supabase = createClient();
  const [records, setRecords] = useState<EmergencyResultRow[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [signedAudioUrl, setSignedAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      const { data, error } = await supabase
        .from("tbl_emergency_result")
        .select(
          "id, resident_id, emergency_req_id, operator_notes, resolved_by, resolved_at, audio_path, summary, call_transcript"
        )
        .order("id", { ascending: false });

      if (error) {
        console.error("Error fetching tbl_emergency_result:", error.message);
      } else {
        const rows = (data ?? []) as EmergencyResultRow[];
        setRecords(rows);
        if (rows.length > 0) setSelectedId(rows.at(0)?.id ?? null);
      }
      setLoading(false);
    }
    loadHistory();
  }, []);

  const filtered = records.filter((item) => {
    const q = query.toLowerCase();
    if (!q) return true;
    return (
      String(item.emergency_req_id).includes(q) ||
      String(item.resident_id).includes(q) ||
      (item.summary ?? "").toLowerCase().includes(q) ||
      (item.resolved_by ?? "").toLowerCase().includes(q)
    );
  });

  const selected =
    filtered.find((r) => r.id === selectedId) ?? filtered.at(0) ?? null;

  useEffect(() => {
    setSignedAudioUrl(null);
    async function signAudio() {
      if (!selected?.audio_path) return;
      const cleanPath = selected.audio_path
        .replace(/^\/+/, "")
        .replace(/^call-recordings\//, "");

      const { data } = await supabase.storage
        .from("call-recordings")
        .createSignedUrl(cleanPath, 3600);
      setSignedAudioUrl(data?.signedUrl ?? null);
    }
    signAudio();
  }, [selected?.id, selected?.audio_path]);
  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Top Bar */}
        <div className="bg-white border border-slate-200/80 rounded-xl px-5 py-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-indigo-900 text-xs font-semibold uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4" />
              Barangay Emergency History
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5">
              Emergency Call History ({filtered.length})
            </h1>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Request ID, location, officer..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-700 focus:bg-white"
            />
          </div>
        </div>

        {/* Main Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: History Table */}
          <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-indigo-50/60 text-xs font-semibold text-slate-500">
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Log / Req ID</th>
                    <th className="py-3.5 px-4">Incident Summary</th>
                    <th className="py-3.5 px-4">Resolved By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-16 text-center text-slate-400 text-sm"
                      >
                        Loading emergency history...
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-16 text-center text-slate-400 text-sm"
                      >
                        No resolved emergency records found inside.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((row) => {
                      const isSelected = selected?.id === row.id;
                      const firstLine =
                        row.summary
                          ?.split("\n")
                          .at(0)
                          ?.replace("INCIDENT:", "")
                          .trim() || "Pending summary";
                      const isCritical = row.summary?.includes("CRITICAL");

                      return (
                        <tr
                          key={row.id}
                          onClick={() => setSelectedId(row.id)}
                          className={
                            "cursor-pointer transition-colors " +
                            (isSelected
                              ? "bg-indigo-50/80 border-l-4 border-l-indigo-900"
                              : "hover:bg-slate-50")
                          }
                        >
                          <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                            {row.resolved_at || "—"}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs">
                            <div className="text-slate-900 font-semibold">
                              #{row.id}
                            </div>
                            <div className="text-slate-400">
                              Req #{row.emergency_req_id}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-800">
                                {firstLine}
                              </span>
                              {isCritical && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                                  CRITICAL
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 truncate max-w-[220px] mt-0.5">
                              {row.operator_notes || "Resident #" + row.resident_id}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-600">
                            {row.resolved_by || "Unassigned"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {/* Right: Detail Inspector Card */}
          <div className="lg:col-span-5">
            {selected ? (
              <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm p-5 space-y-5 sticky top-6">
                {/* Metadata Header */}
                <div className="border-b border-slate-100 pb-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold bg-indigo-900 text-white px-2.5 py-1 rounded-md">
                      Log #{selected.id}
                    </span>
                    <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      Req #{selected.emergency_req_id} • Resident #
                      {selected.resident_id}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-3">
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {selected.resolved_by || "Pending Officer"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {selected.resolved_at || "Not resolved"}
                    </span>
                  </div>
                </div>

                {/* Audio Recording Player */}
                {signedAudioUrl && (
                  <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-indigo-900">
                        <PhoneCall className="w-3.5 h-3.5" />
                        Call Recording
                      </span>
                      <span className="font-mono text-[11px] text-slate-400 truncate max-w-[180px]">
                        {selected.audio_path}
                      </span>
                    </div>
                    <audio
                      controls
                      preload="none"
                      className="w-full h-8"
                      src={signedAudioUrl}
                    />
                  </div>
                )}

                {/* Gemini Barangay Incident Summary */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-900">
                    <FileText className="w-3.5 h-3.5" />
                    AI Barangay Incident Log
                  </div>
                  <pre className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                    {selected.summary || "No summary available."}
                  </pre>
                </div>

                {/* Responder Notes */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <ClipboardEdit className="w-3.5 h-3.5" />
                    Responder
                  </div>
                  <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 text-xs text-slate-700">
                    {selected.operator_notes || "No additional notes recorded."}
                  </div>
                </div>

                {/* Deepgram Taglish Transcript */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Call Transcript ({selected.call_transcript?.length ?? 0}{" "}
                    turns)
                  </div>
                  <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 max-h-60 overflow-y-auto space-y-2.5">
                    {selected.call_transcript?.map((turn, idx) => {
                      const isOperator = turn.role === "Operator";
                      return (
                        <div
                          key={idx}
                          className={
                            "flex flex-col " +
                            (isOperator ? "items-end" : "items-start")
                          }
                        >
                          <div className="text-[10px] text-slate-400 mb-0.5 px-1">
                            {turn.role} • {formatTime(turn.start)}
                          </div>
                          <div
                            className={
                              "rounded-lg px-3 py-2 text-xs max-w-[85%] shadow-xs " +
                              (isOperator
                                ? "bg-indigo-900 text-white"
                                : "bg-white text-slate-700 border border-slate-200")
                            }
                          >
                            {turn.text}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm p-8 text-center text-sm text-slate-400">
                Select an emergency record to view its AI summary, audio, and
                transcript.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

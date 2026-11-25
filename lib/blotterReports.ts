export type BlotterReport = {
  id: string;
  concernType: string;
  concern: string;
  location: string;
  requestedHelp: string;
  createdAt: string;
};

export type NewBlotterReport = Omit<BlotterReport, "id" | "createdAt">;
export type BlotterReportsSnapshot = {
  reports: BlotterReport[];
  error: string | null;
};

export const BLOTTER_REPORTS_STORAGE_KEY = "bglrr-blotter-reports";
const BLOTTER_REPORTS_UPDATED_EVENT = "bglrr:blotter-reports-updated";
const SERVER_SNAPSHOT: BlotterReportsSnapshot = { reports: [], error: null };
let cachedStoredReports: string | null | undefined;
let cachedSnapshot = SERVER_SNAPSHOT;
let hasCachedSnapshot = false;
let storageReadFailed = false;

function isBlotterReport(value: unknown): value is BlotterReport {
  if (typeof value !== "object" || value === null) return false;

  const report = value as Record<string, unknown>;
  return (
    typeof report.id === "string" &&
    typeof report.concernType === "string" &&
    typeof report.concern === "string" &&
    typeof report.location === "string" &&
    typeof report.requestedHelp === "string" &&
    typeof report.createdAt === "string"
  );
}

function parseBlotterReports(storedReports: string | null): BlotterReport[] {
  if (!storedReports) return [];

  const parsedReports: unknown = JSON.parse(storedReports);
  if (!Array.isArray(parsedReports) || !parsedReports.every(isBlotterReport)) {
    throw new Error("Stored blotter reports have an invalid format.");
  }

  return parsedReports;
}

export function getBlotterReportsSnapshot(): BlotterReportsSnapshot {
  if (typeof window === "undefined") return SERVER_SNAPSHOT;
  if (storageReadFailed) return cachedSnapshot;

  let storedReports: string | null;
  try {
    storedReports = window.localStorage.getItem(BLOTTER_REPORTS_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to read blotter reports from browser storage:", error);
    cachedSnapshot = {
      reports: [],
      error: "Blotter reports could not be read from this browser.",
    };
    hasCachedSnapshot = true;
    storageReadFailed = true;
    return cachedSnapshot;
  }

  if (hasCachedSnapshot && storedReports === cachedStoredReports) {
    return cachedSnapshot;
  }

  cachedStoredReports = storedReports;
  try {
    cachedSnapshot = { reports: parseBlotterReports(storedReports), error: null };
  } catch (error) {
    console.error("Failed to parse stored blotter reports:", error);
    cachedSnapshot = {
      reports: [],
      error: "Stored blotter reports have an invalid format.",
    };
  }
  hasCachedSnapshot = true;
  return cachedSnapshot;
}

export function subscribeToBlotterReports(onChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const handleStorageChange = (event: StorageEvent) => {
    if (
      event.key === BLOTTER_REPORTS_STORAGE_KEY ||
      event.key === null
    ) {
      onChange();
    }
  };

  window.addEventListener("storage", handleStorageChange);
  window.addEventListener(BLOTTER_REPORTS_UPDATED_EVENT, onChange);

  return () => {
    window.removeEventListener("storage", handleStorageChange);
    window.removeEventListener(BLOTTER_REPORTS_UPDATED_EVENT, onChange);
  };
}

export function notifyBlotterReportsChanged() {
  cachedStoredReports = undefined;
  hasCachedSnapshot = false;
  storageReadFailed = false;
  window.dispatchEvent(new Event(BLOTTER_REPORTS_UPDATED_EVENT));
}

export function getBlotterReports(): BlotterReport[] {
  const snapshot = getBlotterReportsSnapshot();
  if (snapshot.error) throw new Error(snapshot.error);
  return snapshot.reports;
}

export function saveBlotterReport(input: NewBlotterReport): BlotterReport {
  const reports = getBlotterReports();
  const report: BlotterReport = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };

  window.localStorage.setItem(
    BLOTTER_REPORTS_STORAGE_KEY,
    JSON.stringify([report, ...reports]),
  );
  notifyBlotterReportsChanged();

  return report;
}

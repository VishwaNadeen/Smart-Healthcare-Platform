import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SymptomResultSummaryCard from "../../components/ai/SymptomResultSummaryCard";
import {
  getLatestSymptomCheck,
  getSymptomHistory,
} from "../../services/symptomAiApi";
import type { SymptomCheckRecord } from "../../services/symptomAiApi";
import { getStoredTelemedicineAuth } from "../../utils/telemedicineAuth";
import RequirePatient from "../../components/auth/RequirePatient";

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleString();
}

function timeAgo(value: string) {
  const now = new Date();
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;

  return date.toLocaleDateString();
}

function getStageBadgeClasses(stage: "collecting" | "completed" | "closed") {
  if (stage === "closed") {
    return "border-slate-300 bg-slate-100 text-slate-700";
  }

  if (stage === "completed") {
    return "border-green-200 bg-green-50 text-green-700";
  }

  return "border-blue-200 bg-blue-50 text-blue-700";
}

function SymptomHistoryPageContent() {
  const auth = getStoredTelemedicineAuth();
  const patientId = auth?.userId || "";

  const [records, setRecords] = useState<SymptomCheckRecord[]>([]);
  const [latestRecord, setLatestRecord] = useState<SymptomCheckRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingLatest, setLoadingLatest] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [latestError, setLatestError] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    async function loadInitialHistory() {
      if (!patientId) {
        setError("Logged-in patient ID was not found.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const result = await getSymptomHistory(patientId, { page: 1, limit });

        setRecords(result.records);
        setPage(result.page);
        setHasMore(result.hasMore);
        setTotalCount(result.totalCount);
      } catch (err) {
        setRecords([]);
        setError(err instanceof Error ? err.message : "Failed to load history.");
      } finally {
        setLoading(false);
      }
    }

    loadInitialHistory();
  }, [patientId, limit]);

  useEffect(() => {
    async function loadLatestRecord() {
      try {
        setLoadingLatest(true);
        setLatestError("");

        const data = await getLatestSymptomCheck();
        setLatestRecord(data);
      } catch (err) {
        setLatestRecord(null);
        setLatestError(
          err instanceof Error ? err.message : "Failed to load latest symptom check."
        );
      } finally {
        setLoadingLatest(false);
      }
    }

    loadLatestRecord();
  }, []);

  async function handleLoadMore() {
    if (!patientId || loadingMore || !hasMore) {
      return;
    }

    try {
      setLoadingMore(true);
      setError("");

      const nextPage = page + 1;
      const result = await getSymptomHistory(patientId, {
        page: nextPage,
        limit,
      });

      setRecords((prev) => [...prev, ...result.records]);
      setPage(result.page);
      setHasMore(result.hasMore);
      setTotalCount(result.totalCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more history.");
    } finally {
      setLoadingMore(false);
    }
  }

  const filteredRecords = useMemo(() => {
    if (!latestRecord) {
      return records;
    }

    return records.filter((record) => record._id !== latestRecord._id);
  }, [records, latestRecord]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm">
        <div className="h-1 w-full bg-gradient-to-r from-blue-700 via-blue-500 to-blue-200" />
        <div className="p-6">
          <div className="flex flex-col gap-4">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-slate-800">Symptom History</h1>
              <p className="mt-2 text-sm text-slate-500">
                View your previous symptom analyses and continue saved AI conversations.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-3 md:justify-end">
              <Link
                to="/ai"
                className="inline-flex w-fit items-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
              >
                Start New Conversation
              </Link>
            </div>
          </div>
        </div>
      </div>

      {loadingLatest ? (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Loading latest symptom conversation...</p>
        </div>
      ) : null}

      {!loadingLatest && latestError ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-600 shadow-sm">
          {latestError}
        </div>
      ) : null}

      {!loadingLatest && !latestError && latestRecord ? (
        <section className="mb-6 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                Latest Symptom Conversation
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Last saved on {formatDateTime(latestRecord.createdAt)}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Last active: {timeAgo(latestRecord.updatedAt)}
              </p>
            </div>

            <div
              className={`inline-flex w-fit rounded-full border px-4 py-2 text-sm font-semibold capitalize ${getStageBadgeClasses(
                latestRecord.conversationStage
              )}`}
            >
              {latestRecord.conversationStage}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to={`/ai/check/${latestRecord._id}`}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Continue Conversation
            </Link>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-blue-100 bg-white shadow-sm">
        <div className="border-b border-blue-100 px-6 py-5">
          <h2 className="text-lg font-semibold text-slate-800">
            Logged-in Patient History
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Patient ID: <span className="font-medium">{patientId || "Not found"}</span>
          </p>
          {!loading && !error ? (
            <p className="mt-2 text-xs text-slate-400">
              Showing {records.length} of {totalCount} saved records
            </p>
          ) : null}
        </div>

        <div className="px-6 py-6">
          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              Loading symptom history...
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}
        </div>
      </section>

      <section className="mt-6 space-y-4">
        {!loading && !error && filteredRecords.length === 0 && !latestRecord ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800">
              No symptom history found
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              You do not have any saved symptom checks yet.
            </p>
          </div>
        ) : null}

        {!loading &&
          !error &&
          filteredRecords.map((record) => (
            <div key={record._id} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="px-1 text-sm text-slate-500 flex flex-col">
                  <span>Saved on {formatDateTime(record.createdAt)}</span>
                  <span className="text-xs text-slate-400">
                    Last active: {timeAgo(record.updatedAt)}
                  </span>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    to={`/ai/check/${record._id}`}
                    className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
                  >
                    Continue Conversation
                  </Link>
                </div>
              </div>

              <SymptomResultSummaryCard
                record={record}
                showActions
                compact
              />
            </div>
          ))}

        {!loading && !error && hasMore ? (
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-white px-5 py-3 text-sm font-medium text-blue-700 shadow-sm transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingMore ? "Loading more..." : "Load More"}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

export default function SymptomHistoryPage() {
  return (
    <RequirePatient>
      <SymptomHistoryPageContent />
    </RequirePatient>
  );
}

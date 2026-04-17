import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageLoading from "../../components/common/PageLoading";
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

  const isInitialPageLoading = loading || loadingLatest;

  if (isInitialPageLoading) {
    return <PageLoading message="Loading symptom history..." />;
  }

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

          </div>
        </div>
      </div>

      {!loadingLatest && latestError ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-600 shadow-sm">
          {latestError}
        </div>
      ) : null}

      {!loadingLatest && !latestError && latestRecord ? (
        <section className="mb-6 rounded-2xl border border-blue-100 bg-white shadow-sm transition hover:shadow-md">
          <div className="flex items-start gap-4 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            </div>

            <div className="flex-1 min-w-0">
              <p className="mb-0.5 text-xs font-medium uppercase tracking-wide text-blue-500">Latest</p>
              <h2 className="truncate text-sm font-semibold text-slate-800">
                {latestRecord.initialMessage
                  ? latestRecord.initialMessage.length > 60
                    ? latestRecord.initialMessage.slice(0, 60).trimEnd() + "..."
                    : latestRecord.initialMessage
                  : "Symptom Conversation"}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span>{formatDateTime(latestRecord.createdAt)}</span>
                <span className="text-slate-300">·</span>
                <span>{timeAgo(latestRecord.updatedAt)}</span>
              </div>
            </div>

            <Link
              to={`/ai/check/${latestRecord._id}`}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
              </svg>
              Continue
            </Link>
          </div>
        </section>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

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
          filteredRecords.map((record) => {
            const autoName = record.initialMessage
              ? record.initialMessage.length > 60
                ? record.initialMessage.slice(0, 60).trimEnd() + "..."
                : record.initialMessage
              : "Symptom Conversation";

            return (
              <section key={record._id} className="rounded-2xl border border-blue-100 bg-white shadow-sm transition hover:shadow-md">
                <div className="flex items-start gap-4 p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="truncate text-sm font-semibold text-slate-800">{autoName}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span>{formatDateTime(record.createdAt)}</span>
                      <span className="text-slate-300">·</span>
                      <span>{timeAgo(record.updatedAt)}</span>
                    </div>
                  </div>

                  <Link
                    to={`/ai/check/${record._id}`}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                      <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                    </svg>
                    Continue
                  </Link>
                </div>
              </section>
            );
          })}

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

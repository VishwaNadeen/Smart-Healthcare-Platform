import { useEffect, useMemo, useState } from "react";
import {
  createDoctorSpecialty,
  deleteDoctorSpecialty,
  getDoctorSpecialties,
  updateDoctorSpecialty,
  type DoctorSpecialty,
  type DoctorSpecialtyPayload,
} from "../../services/adminApi";

type Mode = "create" | "edit" | "view";

type FormState = {
  name: string;
  description: string;
  isActive: boolean;
};

const PAGE_SIZES = [5, 10, 20, 50] as const;

function emptyForm(): FormState {
  return {
    name: "",
    description: "",
    isActive: true,
  };
}

function formatDate(value?: string) {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleString();
}

function mapToFormState(specialty: DoctorSpecialty): FormState {
  return {
    name: specialty.name || "",
    description: specialty.description || "",
    isActive: specialty.isActive !== false,
  };
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
      <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${accent}`}>
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium leading-6 text-slate-900">
        {value || "Not provided"}
      </p>
    </div>
  );
}

export default function AdminDoctorSpecialties() {
  const [specialties, setSpecialties] = useState<DoctorSpecialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(
    "all"
  );
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState(1);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<Mode>("create");
  const [selectedSpecialty, setSelectedSpecialty] =
    useState<DoctorSpecialty | null>(null);
  const [formState, setFormState] = useState<FormState>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [panelError, setPanelError] = useState("");

  useEffect(() => {
    async function loadSpecialties() {
      setLoading(true);
      setError("");

      try {
        setSpecialties(await getDoctorSpecialties());
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load doctor specialties."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadSpecialties();
  }, []);

  const stats = useMemo(
    () => ({
      total: specialties.length,
      active: specialties.filter((specialty) => specialty.isActive !== false)
        .length,
      inactive: specialties.filter((specialty) => specialty.isActive === false)
        .length,
    }),
    [specialties]
  );

  const filteredSpecialties = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return specialties.filter((specialty) => {
      if (statusFilter === "active" && specialty.isActive === false) {
        return false;
      }

      if (statusFilter === "inactive" && specialty.isActive !== false) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [specialty.name, specialty.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [search, specialties, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredSpecialties.length / pageSize));
  const rows = filteredSpecialties.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  function openCreatePanel() {
    setPanelMode("create");
    setSelectedSpecialty(null);
    setFormState(emptyForm());
    setPanelError("");
    setPanelOpen(true);
  }

  function openViewPanel(specialty: DoctorSpecialty) {
    setPanelMode("view");
    setSelectedSpecialty(specialty);
    setFormState(mapToFormState(specialty));
    setPanelError("");
    setPanelOpen(true);
  }

  function openEditPanel(specialty: DoctorSpecialty) {
    setPanelMode("edit");
    setSelectedSpecialty(specialty);
    setFormState(mapToFormState(specialty));
    setPanelError("");
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
    setPanelError("");
    setSelectedSpecialty(null);
    setFormState(emptyForm());
    setPanelMode("create");
  }

  function syncSpecialty(updated: DoctorSpecialty) {
    setSpecialties((current) => {
      const exists = current.some((specialty) => specialty._id === updated._id);

      if (!exists) {
        return [updated, ...current].sort((left, right) =>
          left.name.localeCompare(right.name)
        );
      }

      return current
        .map((specialty) =>
          specialty._id === updated._id ? updated : specialty
        )
        .sort((left, right) => left.name.localeCompare(right.name));
    });
  }

  async function handleSubmit() {
    setSubmitting(true);
    setPanelError("");

    const payload: DoctorSpecialtyPayload = {
      name: formState.name.trim(),
      description: formState.description.trim(),
      isActive: formState.isActive,
    };

    try {
      const response =
        panelMode === "edit" && selectedSpecialty
          ? await updateDoctorSpecialty(selectedSpecialty._id, payload)
          : await createDoctorSpecialty(payload);

      syncSpecialty(response);
      closePanel();
    } catch (submitError) {
      setPanelError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to save specialty."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(specialty: DoctorSpecialty) {
    const confirmed = window.confirm(
      `Delete ${specialty.name}? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    setPanelError("");

    try {
      await deleteDoctorSpecialty(specialty._id);
      setSpecialties((current) =>
        current.filter((item) => item._id !== specialty._id)
      );

      if (selectedSpecialty?._id === specialty._id) {
        closePanel();
      }
    } catch (deleteError) {
      const message =
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete specialty.";

      if (selectedSpecialty?._id === specialty._id) {
        setPanelError(message);
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-slate-200 bg-[linear-gradient(135deg,_#0f172a,_#1d4ed8_52%,_#dbeafe_160%)] p-7 text-white shadow-sm">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-blue-100">
              Doctor Setup
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight">
              Specialty Management
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-blue-100/90">
              Create, review, update, and retire doctor specialties from one clean
              admin workspace. This list directly affects doctor registration and
              profile management.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Total" value={String(stats.total)} accent="text-blue-100" />
            <StatCard label="Active" value={String(stats.active)} accent="text-emerald-300" />
            <StatCard
              label="Inactive"
              value={String(stats.inactive)}
              accent="text-amber-300"
            />
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Specialty Directory
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Search the list, filter active or inactive specialties, and open
                any item to inspect or edit it.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreatePanel}
              className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              Create Specialty
            </button>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(260px,1.5fr)_180px_160px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by specialty name or description..."
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "all" | "active" | "inactive")
              }
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <select
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size} per page
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-10 text-sm text-slate-600">
            Loading specialties...
          </div>
        ) : filteredSpecialties.length === 0 ? (
          <div className="px-6 py-10 text-sm text-slate-600">
            No specialties matched the selected filters.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Specialty</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Updated</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 bg-white">
                  {rows.map((specialty) => (
                    <tr key={specialty._id} className="transition hover:bg-slate-50">
                      <td className="px-6 py-5">
                        <p className="text-sm font-semibold text-slate-900">
                          {specialty.name}
                        </p>
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-700">
                        {specialty.description || "No description provided"}
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                            specialty.isActive !== false
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                          }`}
                        >
                          {specialty.isActive !== false ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-600">
                        {formatDate(specialty.updatedAt || specialty.createdAt)}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openViewPanel(specialty)}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditPanel(specialty)}
                            className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(specialty)}
                            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-4 border-t border-slate-200 px-6 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <p>
                Showing{" "}
                <span className="font-semibold text-slate-900">
                  {filteredSpecialties.length === 0
                    ? 0
                    : (page - 1) * pageSize + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-slate-900">
                  {Math.min(page * pageSize, filteredSpecialties.length)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-900">
                  {filteredSpecialties.length}
                </span>{" "}
                specialties
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="rounded-xl bg-slate-100 px-4 py-2 font-semibold text-slate-700">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  disabled={page === totalPages}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {panelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-sm">
          <div className="flex h-full w-full max-w-2xl flex-col border-l border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
                    Doctor Specialty
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-900">
                    {panelMode === "create"
                      ? "Create Specialty"
                      : selectedSpecialty?.name || "Specialty Details"}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closePanel}
                  className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
              {panelError && (
                <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {panelError}
                </div>
              )}

              {panelMode === "view" && selectedSpecialty ? (
                <div className="space-y-4">
                  <DetailField label="Name" value={selectedSpecialty.name} />
                  <DetailField
                    label="Description"
                    value={selectedSpecialty.description || ""}
                  />
                  <DetailField
                    label="Status"
                    value={selectedSpecialty.isActive !== false ? "Active" : "Inactive"}
                  />
                  <DetailField
                    label="Created"
                    value={formatDate(selectedSpecialty.createdAt)}
                  />
                  <DetailField
                    label="Updated"
                    value={formatDate(selectedSpecialty.updatedAt)}
                  />
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Specialty Name
                    </label>
                    <input
                      value={formState.name}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Description
                    </label>
                    <textarea
                      value={formState.description}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      rows={5}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                    />
                  </div>

                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={formState.isActive}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          isActive: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    Keep this specialty active for doctor registration and profile use
                  </label>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => void handleSubmit()}
                      disabled={submitting}
                      className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
                    >
                      {submitting
                        ? "Saving..."
                        : panelMode === "create"
                        ? "Create Specialty"
                        : "Save Changes"}
                    </button>

                    {panelMode === "edit" && selectedSpecialty && (
                      <button
                        type="button"
                        onClick={() => setFormState(mapToFormState(selectedSpecialty))}
                        className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

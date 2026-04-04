import { useEffect, useMemo, useState } from "react";
import {
  deleteDoctor as deleteDoctorRecord,
  getDoctorDetails,
  getDoctorVerifications,
  updateDoctorDetails,
  updateDoctorVerification,
  type DoctorReviewNote,
  type DoctorUpdatePayload,
  type DoctorVerification,
  type DoctorVerificationStatus,
} from "../../services/adminApi";

const FILTERS: Array<{ label: string; value: DoctorVerificationStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "In Review", value: "in-review" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

const PAGE_SIZES = [5, 10, 20, 50] as const;
const REVIEW_UNLOCKABLE_FIELDS = [
  "fullName",
  "phone",
  "qualification",
  "licenseNumber",
  "hospitalName",
  "hospitalAddress",
  "city",
  "consultationFee",
  "about",
] as const;
type PanelTab = "overview" | "edit" | "review";
type EditState = Omit<DoctorUpdatePayload, "experience" | "consultationFee"> & {
  experience: string;
  consultationFee: string;
};

const badgeClass = (status: DoctorVerificationStatus) =>
  status === "approved"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : status === "rejected"
    ? "border-rose-200 bg-rose-50 text-rose-700"
    : status === "in-review"
    ? "border-orange-200 bg-orange-50 text-orange-700"
    : "border-amber-200 bg-amber-50 text-amber-700";

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleString() : "Not reviewed yet";

const formatCurrency = (value?: number) =>
  value === undefined
    ? "Not set"
    : new Intl.NumberFormat("en-LK", {
        style: "currency",
        currency: "LKR",
        maximumFractionDigits: 0,
      }).format(value);

const escapeCsvCell = (value: string | number | boolean | null | undefined) => {
  const normalized = String(value ?? "").replace(/"/g, '""');
  return `"${normalized}"`;
};

const escapePdfText = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

const slugifyFilePart = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "all";

type ExportRow = Record<string, string>;

const buildExportRows = (items: DoctorVerification[]): ExportRow[] =>
  items.map((doctor) => ({
    fullName: doctor.fullName,
    email: doctor.email,
    isEmailVerified:
      doctor.isEmailVerified === true
        ? "Verified"
        : doctor.isEmailVerified === false
        ? "Not Verified"
        : "Unavailable",
    phone: doctor.phone,
    specialization: doctor.specialization,
    experience: String(doctor.experience ?? ""),
    qualification: doctor.qualification,
    licenseNumber: doctor.licenseNumber,
    hospitalName: doctor.hospitalName || "",
    hospitalAddress: doctor.hospitalAddress || "",
    city: doctor.city || "",
    availableDays: JSON.stringify(doctor.availableDays || []),
    availableTimeSlots: JSON.stringify(doctor.availableTimeSlots || []),
    consultationFee: String(doctor.consultationFee ?? ""),
    acceptsNewAppointments:
      doctor.acceptsNewAppointments === undefined
        ? ""
        : String(doctor.acceptsNewAppointments),
    profileImage: doctor.profileImage || "",
    about: doctor.about || "",
    verificationStatus: doctor.verificationStatus,
    verificationNote: doctor.verificationNote || "",
    verifiedAt: doctor.verifiedAt || "",
    availabilitySchedule: JSON.stringify(doctor.availabilitySchedule || []),
    createdAt: doctor.createdAt || "",
  }));

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const exportRowsToCsv = (rows: ExportRow[], fileName: string) => {
  const headers = Object.keys(rows[0] || {});
  const body = rows.map((row) =>
    headers.map((header) => escapeCsvCell(row[header])).join(",")
  );

  downloadBlob(
    new Blob([[headers.map(escapeCsvCell).join(","), ...body].join("\r\n")], {
      type: "text/csv;charset=utf-8;",
    }),
    fileName
  );
};

const exportRowsToExcel = (rows: ExportRow[], fileName: string) => {
  const headers = Object.keys(rows[0] || {});
  const headerHtml = headers
    .map((header) => `<th>${header}</th>`)
    .join("");

  const rowHtml = rows
    .map(
      (row) => `
        <tr>
          ${headers.map((header) => `<td>${row[header]}</td>`).join("")}
        </tr>
      `
    )
    .join("");

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
          th { background: #e2e8f0; }
        </style>
      </head>
      <body>
        <table>
          <thead><tr>${headerHtml}</tr></thead>
          <tbody>${rowHtml}</tbody>
        </table>
      </body>
    </html>
  `;

  downloadBlob(
    new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" }),
    fileName
  );
};

const exportRowsToPdf = (rows: ExportRow[], fileName: string) => {
  const lines = [
    "Doctors Export",
    "",
    ...rows.flatMap((row, index) => [
      `Doctor ${index + 1}`,
      ...Object.entries(row).map(([key, value]) => `${key}: ${value}`),
      "",
    ]),
  ];

  const pageWidth = 595;
  const pageHeight = 842;
  const left = 40;
  const top = 800;
  const lineHeight = 16;
  const linesPerPage = 45;
  const pages: string[][] = [];

  for (let index = 0; index < lines.length; index += linesPerPage) {
    pages.push(lines.slice(index, index + linesPerPage));
  }

  const objects: string[] = [];
  const pageIds: number[] = [];
  const contentIds: number[] = [];

  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const fontId = 1;
  let nextId = 2;

  pages.forEach((pageLines) => {
    const contentStream = [
      "BT",
      "/F1 11 Tf",
      ...pageLines.map((line, lineIndex) => {
        const y = top - lineIndex * lineHeight;
        return `${left} ${y} Td (${escapePdfText(line)}) Tj`;
      }),
      "ET",
    ].join("\n");

    const contentId = nextId;
    nextId += 1;
    contentIds.push(contentId);
    objects.push(
      `<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream`
    );

    const pageId = nextId;
    nextId += 1;
    pageIds.push(pageId);
    objects.push(
      `<< /Type /Page /Parent ${nextId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`
    );
  });

  const pagesId = nextId;
  nextId += 1;
  objects.push(
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`
  );

  const catalogId = nextId;
  objects.push(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  const reorderedObjects = [
    objects[0],
    ...pageIds.flatMap((pageId, index) => [objects[contentIds[index] - 1], objects[pageId - 1]]),
    objects[pagesId - 1],
    objects[catalogId - 1],
  ];

  const normalizedIds = reorderedObjects.map((_, index) => index + 1);
  const normalizedFontId = 1;
  const normalizedPagePairs = pages.map((_, index) => ({
    contentId: 2 + index * 2,
    pageId: 3 + index * 2,
  }));
  const normalizedPagesId = reorderedObjects.length - 1;
  const normalizedCatalogId = reorderedObjects.length;

  const normalizedObjects = [
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`,
    ...pages.flatMap((pageLines, index) => {
      const contentStream = [
        "BT",
        "/F1 11 Tf",
        ...pageLines.map((line, lineIndex) => {
          const y = top - lineIndex * lineHeight;
          return lineIndex === 0
            ? `${left} ${y} Td (${escapePdfText(line)}) Tj`
            : `0 -${lineHeight} Td (${escapePdfText(line)}) Tj`;
        }),
        "ET",
      ].join("\n");

      return [
        `<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream`,
        `<< /Type /Page /Parent ${normalizedPagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${normalizedFontId} 0 R >> >> /Contents ${normalizedPagePairs[index].contentId} 0 R >>`,
      ];
    }),
    `<< /Type /Pages /Kids [${normalizedPagePairs.map((pair) => `${pair.pageId} 0 R`).join(" ")}] /Count ${normalizedPagePairs.length} >>`,
    `<< /Type /Catalog /Pages ${normalizedPagesId} 0 R >>`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];

  normalizedObjects.forEach((objectBody, index) => {
    offsets[index + 1] = pdf.length;
    pdf += `${index + 1} 0 obj\n${objectBody}\nendobj\n`;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${normalizedObjects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 1; index <= normalizedObjects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${normalizedObjects.length + 1} /Root ${normalizedCatalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  downloadBlob(new Blob([pdf], { type: "application/pdf" }), fileName);
};

function EmailVerificationBadge({
  isVerified,
}: {
  isVerified?: boolean;
}) {
  if (isVerified === true) {
    return (
      <span
        title="Email verified"
        aria-label="Email verified"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700"
      >
        ✓
      </span>
    );
  }

  if (isVerified === false) {
    return (
      <span
        title="Email not verified"
        aria-label="Email not verified"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700"
      >
        !
      </span>
    );
  }

  return (
    <span
      title="Email verification unavailable"
      aria-label="Email verification unavailable"
      className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500"
    >
      ?
    </span>
  );
}

const toEditState = (doctor: DoctorVerification): EditState => ({
  fullName: doctor.fullName || "",
  email: doctor.email || "",
  phone: doctor.phone || "",
  specialization: doctor.specialization || "",
  experience: String(doctor.experience ?? ""),
  qualification: doctor.qualification || "",
  licenseNumber: doctor.licenseNumber || "",
  consultationFee: String(doctor.consultationFee ?? ""),
  hospitalName: doctor.hospitalName || "",
  hospitalAddress: doctor.hospitalAddress || "",
  city: doctor.city || "",
  about: doctor.about || "",
  acceptsNewAppointments: doctor.acceptsNewAppointments !== false,
});

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium leading-6 text-slate-900">{value || "Not provided"}</p>
    </div>
  );
}

function ReviewTimeline({ notes }: { notes: DoctorReviewNote[] }) {
  if (notes.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
        No review notes added yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notes
        .slice()
        .reverse()
        .map((note, index) => (
          <div
            key={`${note.createdAt || "review"}-${index}`}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${badgeClass(note.status)}`}>
                {note.status}
              </span>
              <span className="text-xs text-slate-500">{formatDate(note.createdAt)}</span>
              {note.createdByName && (
                <span className="text-xs text-slate-500">by {note.createdByName}</span>
              )}
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-700">{note.note}</p>
            {note.editableFields && note.editableFields.length > 0 && (
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                Editable fields: {note.editableFields.join(", ")}
              </p>
            )}
          </div>
        ))}
    </div>
  );
}

export default function AdminDoctorVerifications() {
  const [doctors, setDoctors] = useState<DoctorVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DoctorVerificationStatus | "all">("all");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState(1);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTab>("overview");
  const [selected, setSelected] = useState<DoctorVerification | null>(null);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelError, setPanelError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<DoctorVerificationStatus>("pending");
  const [reviewNote, setReviewNote] = useState("");
  const [editableFields, setEditableFields] = useState<string[]>([]);
  const [editState, setEditState] = useState<EditState | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        setDoctors(await getDoctorVerifications("all"));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load doctors.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const specialtyOptions = useMemo(
    () => [...new Set(doctors.map((doctor) => doctor.specialization).filter(Boolean))].sort(),
    [doctors]
  );

  const stats = useMemo(
    () => ({
      total: doctors.length,
      approved: doctors.filter((doctor) => doctor.verificationStatus === "approved").length,
      pending: doctors.filter((doctor) => doctor.verificationStatus === "pending").length,
      review: doctors.filter((doctor) => doctor.verificationStatus === "in-review").length,
      rejected: doctors.filter((doctor) => doctor.verificationStatus === "rejected").length,
    }),
    [doctors]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return doctors.filter((doctor) => {
      if (statusFilter !== "all" && doctor.verificationStatus !== statusFilter) return false;
      if (specialtyFilter !== "all" && doctor.specialization !== specialtyFilter) return false;
      if (!term) return true;
      return [
        doctor.fullName,
        doctor.email,
        doctor.phone,
        doctor.specialization,
        doctor.licenseNumber,
        doctor.city,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [doctors, search, specialtyFilter, statusFilter]);

  const exportRows = useMemo(() => buildExportRows(filtered), [filtered]);
  const exportFileBaseName = useMemo(() => {
    const datePart = new Date().toISOString().slice(0, 10);
    return `doctors-${slugifyFilePart(statusFilter)}-${datePart}`;
  }, [statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => setPage(1), [search, statusFilter, specialtyFilter, pageSize]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  async function openPanel(doctorId: string, tab: PanelTab) {
    setPanelOpen(true);
    setPanelTab(tab);
    setPanelLoading(true);
    setPanelError("");
    try {
      const doctor = await getDoctorDetails(doctorId);
      setSelected(doctor);
      setEditState(toEditState(doctor));
      setReviewStatus(doctor.verificationStatus);
      setReviewNote(doctor.verificationNote || "");
      setEditableFields(doctor.editableFields || []);
    } catch (err) {
      setPanelError(err instanceof Error ? err.message : "Failed to load doctor details.");
    } finally {
      setPanelLoading(false);
    }
  }

  function syncDoctor(updated: DoctorVerification) {
    setDoctors((current) => current.map((doctor) => doctor._id === updated._id ? updated : doctor));
    setSelected(updated);
    setEditState(toEditState(updated));
    setReviewStatus(updated.verificationStatus);
    setReviewNote(updated.verificationNote || "");
    setEditableFields(updated.editableFields || []);
  }

  async function saveDetails() {
    if (!selected || !editState) return;
    setSubmitting(true);
    setPanelError("");
    try {
      const updated = await updateDoctorDetails(selected._id, {
        ...editState,
        fullName: editState.fullName.trim(),
        email: editState.email.trim().toLowerCase(),
        phone: editState.phone.trim(),
        specialization: editState.specialization.trim(),
        experience: Number(editState.experience) || 0,
        qualification: editState.qualification.trim(),
        licenseNumber: editState.licenseNumber.trim(),
        consultationFee: Number(editState.consultationFee) || 0,
        hospitalName: editState.hospitalName.trim(),
        hospitalAddress: editState.hospitalAddress.trim(),
        city: editState.city.trim(),
        about: editState.about.trim(),
      });
      syncDoctor(updated);
      setPanelTab("overview");
    } catch (err) {
      setPanelError(err instanceof Error ? err.message : "Failed to update doctor.");
    } finally {
      setSubmitting(false);
    }
  }

  async function saveReview() {
    if (!selected) return;
    setSubmitting(true);
    setPanelError("");
    try {
      const response = await updateDoctorVerification(selected._id, {
        verificationStatus: reviewStatus,
        verificationNote: reviewNote.trim() || undefined,
        editableFields,
      });
      syncDoctor(response.doctor);
      setReviewNote("");
      setPanelTab("overview");
    } catch (err) {
      setPanelError(err instanceof Error ? err.message : "Failed to update review.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    if (!window.confirm(`Delete ${selected.fullName}? This removes the doctor and linked auth account.`)) return;
    setSubmitting(true);
    setPanelError("");
    try {
      await deleteDoctorRecord(selected._id);
      setDoctors((current) => current.filter((doctor) => doctor._id !== selected._id));
      setPanelOpen(false);
      setSelected(null);
    } catch (err) {
      setPanelError(err instanceof Error ? err.message : "Failed to delete doctor.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleExport(format: "csv" | "excel" | "pdf") {
    if (exportRows.length === 0) {
      setError("No doctors matched the selected filters to export.");
      return;
    }

    setError("");

    if (format === "csv") {
      exportRowsToCsv(exportRows, `${exportFileBaseName}.csv`);
      return;
    }

    if (format === "excel") {
      exportRowsToExcel(exportRows, `${exportFileBaseName}.xls`);
      return;
    }

    if (format === "pdf") {
      exportRowsToPdf(exportRows, `${exportFileBaseName}.pdf`);
      return;
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-slate-200 bg-[linear-gradient(135deg,_#0f172a,_#1d4ed8_52%,_#dbeafe_160%)] p-7 text-white shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-blue-100">Doctor Oversight</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">Doctor Directory Management</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-blue-100/90">Review the full doctor roster, search by identity or specialty, inspect profile details, edit records, capture review notes, and update verification decisions from one admin workspace.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["Total", stats.total], ["Pending", stats.pending], ["In Review", stats.review], ["Approved", stats.approved], ["Rejected", stats.rejected],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">{label}</p>
              <p className="mt-2 text-3xl font-bold text-white">{value}</p>
            </div>
          ))}
        </div>
      </section>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Doctors Table</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Search, filter, paginate, and open any doctor for review, editing, or deletion.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((item) => (
                <button key={item.value} type="button" onClick={() => setStatusFilter(item.value)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${statusFilter === item.value ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(260px,1.5fr)_1fr_160px]">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search doctor, email, phone, specialty, license..." className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100" />
            <select value={specialtyFilter} onChange={(e) => setSpecialtyFilter(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100">
              <option value="all">All specialties</option>
              {specialtyOptions.map((specialty) => <option key={specialty} value={specialty}>{specialty}</option>)}
            </select>
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100">
              {PAGE_SIZES.map((size) => <option key={size} value={size}>{size} per page</option>)}
            </select>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm text-slate-600">
              Export the current filtered doctor list in your preferred format.
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => handleExport("csv")} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                Export CSV
              </button>
              <button type="button" onClick={() => handleExport("excel")} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                Export Excel
              </button>
              <button type="button" onClick={() => handleExport("pdf")} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                Export PDF
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-10 text-sm text-slate-600">Loading doctor records...</div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-10 text-sm text-slate-600">No doctors matched the selected filters.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Doctor</th><th className="px-6 py-4">Specialty</th><th className="px-6 py-4">City</th><th className="px-6 py-4">Fee</th><th className="px-6 py-4">Verification</th><th className="px-6 py-4">Reviewed</th><th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {rows.map((doctor) => (
                    <tr key={doctor._id} className="transition hover:bg-slate-50">
                      <td className="px-6 py-5">
                        <p className="text-sm font-semibold text-slate-900">{doctor.fullName}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <p className="text-sm text-slate-500">{doctor.email}</p>
                          <EmailVerificationBadge isVerified={doctor.isEmailVerified} />
                        </div>
                        <p className="mt-1 text-xs text-slate-400">{doctor.phone}</p>
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-700"><p className="font-medium text-slate-900">{doctor.specialization}</p><p className="mt-1">{doctor.experience} years</p></td>
                      <td className="px-6 py-5 text-sm text-slate-700">{doctor.city || "Not provided"}</td>
                      <td className="px-6 py-5 text-sm font-medium text-slate-900">{formatCurrency(doctor.consultationFee)}</td>
                      <td className="px-6 py-5"><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${badgeClass(doctor.verificationStatus)}`}>{doctor.verificationStatus}</span></td>
                      <td className="px-6 py-5 text-sm text-slate-600">{formatDate(doctor.verifiedAt)}</td>
                      <td className="px-6 py-5"><div className="flex justify-end gap-2"><button type="button" onClick={() => void openPanel(doctor._id, "overview")} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">View</button><button type="button" onClick={() => void openPanel(doctor._id, "edit")} className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100">Edit</button><button type="button" onClick={() => void openPanel(doctor._id, "review")} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">Review</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-4 border-t border-slate-200 px-6 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <p>Showing <span className="font-semibold text-slate-900">{filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> to <span className="font-semibold text-slate-900">{Math.min(page * pageSize, filtered.length)}</span> of <span className="font-semibold text-slate-900">{filtered.length}</span> doctors</p>
              <div className="flex items-center gap-2"><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50">Previous</button><span className="rounded-xl bg-slate-100 px-4 py-2 font-semibold text-slate-700">Page {page} of {totalPages}</span><button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages} className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50">Next</button></div>
            </div>
          </>
        )}
      </section>

      {panelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-sm">
          <div className="flex h-full w-full max-w-3xl flex-col border-l border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">Doctor Workspace</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-900">{selected?.fullName || "Doctor details"}</h2>
                </div>
                <button type="button" onClick={() => setPanelOpen(false)} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100">Close</button>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {(["overview", "edit", "review"] as PanelTab[]).map((tab) => (
                  <button key={tab} type="button" onClick={() => setPanelTab(tab)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${panelTab === tab ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
                    {tab === "overview" ? "Overview" : tab === "edit" ? "Edit Details" : "Review & Notes"}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
              {panelLoading ? <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">Loading doctor details...</div> : panelError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{panelError}</div> : !selected ? <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">Doctor details are not available.</div> : (
                <>
                  {panelTab === "overview" && (
                    <div className="space-y-5">
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Full Name" value={selected.fullName} />
                        <Field label="Email" value={selected.email} />
                        <Field label="Phone" value={selected.phone} />
                        <Field label="Specialization" value={selected.specialization} />
                        <Field label="Qualification" value={selected.qualification} />
                        <Field label="Experience" value={`${selected.experience} years`} />
                        <Field label="License Number" value={selected.licenseNumber} />
                        <Field label="Consultation Fee" value={formatCurrency(selected.consultationFee)} />
                        <Field label="Hospital Name" value={selected.hospitalName || ""} />
                        <Field label="City" value={selected.city || ""} />
                        <Field label="Verification Status" value={selected.verificationStatus} />
                        <Field label="Reviewed At" value={formatDate(selected.verifiedAt)} />
                        <div className="md:col-span-2"><Field label="About" value={selected.about || ""} /></div>
                      </div>
                      <div>
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <h3 className="text-lg font-bold text-slate-900">Review Timeline</h3>
                          {selected.editableFields && selected.editableFields.length > 0 && (
                            <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-700">
                              Editable: {selected.editableFields.join(", ")}
                            </span>
                          )}
                        </div>
                        <ReviewTimeline notes={selected.reviewNotes || []} />
                      </div>
                    </div>
                  )}

                  {panelTab === "edit" && editState && (
                    <div className="space-y-5">
                      <div className="grid gap-5 md:grid-cols-2">
                        {[
                          ["fullName", "Full Name"], ["email", "Email"], ["phone", "Phone"], ["specialization", "Specialization"], ["experience", "Experience"], ["consultationFee", "Consultation Fee"], ["qualification", "Qualification"], ["licenseNumber", "License Number"], ["hospitalName", "Hospital Name"], ["city", "City"],
                        ].map(([name, label]) => (
                          <div key={name}>
                            <label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>
                            <input name={name} value={editState[name as keyof EditState] as string} onChange={(e) => setEditState((current) => current ? { ...current, [name]: e.target.value } : current)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100" />
                          </div>
                        ))}
                        <div className="md:col-span-2"><label className="mb-2 block text-sm font-semibold text-slate-700">Hospital Address</label><textarea name="hospitalAddress" value={editState.hospitalAddress} onChange={(e) => setEditState((current) => current ? { ...current, hospitalAddress: e.target.value } : current)} rows={3} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100" /></div>
                        <div className="md:col-span-2"><label className="mb-2 block text-sm font-semibold text-slate-700">About</label><textarea name="about" value={editState.about} onChange={(e) => setEditState((current) => current ? { ...current, about: e.target.value } : current)} rows={4} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100" /></div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button type="button" onClick={() => void saveDetails()} disabled={submitting} className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60">{submitting ? "Saving..." : "Save Doctor Details"}</button>
                        <button type="button" onClick={() => setEditState(selected ? toEditState(selected) : null)} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">Reset</button>
                      </div>
                    </div>
                  )}

                  {panelTab === "review" && (
                    <div className="space-y-5">
                      <div><label className="mb-2 block text-sm font-semibold text-slate-700">Verification Status</label><select value={reviewStatus} onChange={(e) => setReviewStatus(e.target.value as DoctorVerificationStatus)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"><option value="pending">Pending</option><option value="in-review">In Review</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Allow Doctor To Edit
                        </label>
                        <div className="grid gap-3 md:grid-cols-2">
                          {REVIEW_UNLOCKABLE_FIELDS.map((field) => (
                            <label
                              key={field}
                              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
                            >
                              <input
                                type="checkbox"
                                checked={editableFields.includes(field)}
                                onChange={(event) =>
                                  setEditableFields((current) =>
                                    event.target.checked
                                      ? [...current, field]
                                      : current.filter((value) => value !== field)
                                  )
                                }
                                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                              />
                              {field}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div><label className="mb-2 block text-sm font-semibold text-slate-700">Review Notes</label><textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} rows={5} placeholder="Add review notes, approval comments, or rejection reasons." className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100" /></div>
                      <div>
                        <h3 className="mb-3 text-lg font-bold text-slate-900">Notes History</h3>
                        <ReviewTimeline notes={selected.reviewNotes || []} />
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button type="button" onClick={() => void saveReview()} disabled={submitting} className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60">{submitting ? "Saving..." : "Save Review"}</button>
                        <button type="button" onClick={() => void handleDelete()} disabled={submitting} className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60">{submitting ? "Working..." : "Delete Doctor"}</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

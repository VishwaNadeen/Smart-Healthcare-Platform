import { useEffect, useState } from "react";
import {
  getPrescriptionsByAppointmentId,
  type TelemedicinePrescription,
} from "../../services/telemedicineApi";

type PrescriptionPdfGeneratorProps = {
  appointmentId: string;
  specialization: string;
  doctorName: string;
  licenseNumber: string;
  hospitalName: string;
  patientName: string;
  patientAge: number | null;
  autoRefreshWhenEmpty?: boolean;
  buttonClassName?: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getSafeLabel(value: string | number | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized || "Not available";
}

export default function PrescriptionPdfGenerator({
  appointmentId,
  specialization,
  doctorName,
  licenseNumber,
  hospitalName,
  patientName,
  patientAge,
  autoRefreshWhenEmpty = false,
  buttonClassName,
}: PrescriptionPdfGeneratorProps) {
  const [prescriptions, setPrescriptions] = useState<TelemedicinePrescription[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const canDownload = prescriptions.length > 0;

  useEffect(() => {
    let isMounted = true;
    let intervalId: number | null = null;

    async function loadPrescriptions() {
      try {
        const response = await getPrescriptionsByAppointmentId(appointmentId);
        const nextPrescriptions = response.data || [];

        if (isMounted) {
          setPrescriptions(nextPrescriptions);
        }

        if (nextPrescriptions.length > 0 && intervalId !== null) {
          window.clearInterval(intervalId);
          intervalId = null;
        }
      } catch (error) {
        console.error("Failed to load prescriptions for PDF:", error);
        if (isMounted) {
          setPrescriptions([]);
        }
      }
    }

    if (appointmentId) {
      void loadPrescriptions();

      if (autoRefreshWhenEmpty) {
        intervalId = window.setInterval(() => {
          void loadPrescriptions();
        }, 5000);
      }
    } else {
      setPrescriptions([]);
    }

    return () => {
      isMounted = false;
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [appointmentId, autoRefreshWhenEmpty]);

  async function handleGeneratePdf() {
    try {
      setIsGenerating(true);

      let nextPrescriptions = prescriptions;

      if (appointmentId) {
        const response = await getPrescriptionsByAppointmentId(appointmentId);
        nextPrescriptions = response.data || [];
        setPrescriptions(nextPrescriptions);
      }

    const printWindow = window.open("", "_blank", "width=900,height=1200");

    if (!printWindow) {
      return;
    }

    const generatedOn = new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date());

    const prescriptionsPerPage = 4;
    const prescriptionChunks =
      nextPrescriptions.length > 0
        ? Array.from(
            { length: Math.ceil(nextPrescriptions.length / prescriptionsPerPage) },
            (_, index) =>
              nextPrescriptions.slice(
                index * prescriptionsPerPage,
                (index + 1) * prescriptionsPerPage
              )
          )
        : [[]];

    const pagesMarkup = prescriptionChunks
      .map((chunk, pageIndex) => {
        const isFirstPage = pageIndex === 0;
        const rows = Array.from({ length: prescriptionsPerPage }, (_, rowIndex) => {
          const prescription = chunk[rowIndex];

          if (prescription) {
            return `
              <tr>
                <td>${pageIndex * prescriptionsPerPage + rowIndex + 1}</td>
                <td>${escapeHtml(getSafeLabel(prescription.medicineName))}</td>
                <td>${escapeHtml(getSafeLabel(prescription.dosage))}</td>
                <td>${escapeHtml(getSafeLabel(prescription.instructions))}</td>
              </tr>
            `;
          }

          if (nextPrescriptions.length === 0 && rowIndex === 0) {
            return `
              <tr>
                <td colspan="4" class="empty-row">No prescriptions available.</td>
              </tr>
            `;
          }

          return `
            <tr class="placeholder-row">
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
            </tr>
          `;
        }).join("");

        return `
          <div class="page${pageIndex < prescriptionChunks.length - 1 ? " page-break" : ""}">
            <div class="sheet">
              <div class="watermark watermark-1">Smart Healthcare</div>
              <div class="watermark watermark-2">Smart Healthcare</div>
              <div class="watermark watermark-3">Smart Healthcare</div>
              <div class="watermark watermark-4">Smart Healthcare</div>
              <div class="watermark watermark-5">Smart Healthcare</div>
              <div class="header">
                <h1 class="brand">Smart Healthcare Medical Center</h1>
                <p class="subtitle">Prescription Summary</p>
                <div class="meta-row">
                  <span>Appointment ID: ${escapeHtml(getSafeLabel(appointmentId))}</span>
                  <span>Issued Date: ${escapeHtml(generatedOn)}</span>
                </div>
              </div>
              <div class="content">
                ${
                  isFirstPage
                    ? `
                      <div class="section">
                        <h2 class="section-title">Doctor Details</h2>
                        <div class="details-grid">
                          <div class="detail-item">
                            <span class="detail-label">Doctor Name</span>
                            <span class="detail-value">${escapeHtml(getSafeLabel(doctorName))}</span>
                          </div>
                          <div class="detail-item">
                            <span class="detail-label">License Number</span>
                            <span class="detail-value">${escapeHtml(getSafeLabel(licenseNumber))}</span>
                          </div>
                          <div class="detail-item">
                            <span class="detail-label">Specialization</span>
                            <span class="detail-value">${escapeHtml(getSafeLabel(specialization))}</span>
                          </div>
                          <div class="detail-item">
                            <span class="detail-label">Medical Center</span>
                            <span class="detail-value">${escapeHtml(getSafeLabel(hospitalName))}</span>
                          </div>
                        </div>
                      </div>

                      <div class="section">
                        <h2 class="section-title">Patient Details</h2>
                        <div class="details-grid">
                          <div class="detail-item">
                            <span class="detail-label">Patient Name</span>
                            <span class="detail-value">${escapeHtml(getSafeLabel(patientName))}</span>
                          </div>
                          <div class="detail-item">
                            <span class="detail-label">Age</span>
                            <span class="detail-value">${escapeHtml(getSafeLabel(patientAge))}</span>
                          </div>
                        </div>
                      </div>
                    `
                    : `
                      <div class="section compact-section">
                        <h2 class="section-title">Prescription Continuation</h2>
                        <p class="continuation-note">
                          Additional prescribed medicines for this appointment.
                        </p>
                      </div>
                    `
                }

                <div class="section prescription-section">
                  <h2 class="section-title">Prescriptions</h2>
                  <div class="prescription-table-wrap">
                    <table class="prescription-table">
                      <thead>
                        <tr>
                          <th style="width: 8%;">No</th>
                          <th style="width: 30%;">Medicine</th>
                          <th style="width: 18%;">Dosage</th>
                          <th>Instructions</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${rows}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div class="footer-note">
                  This document was generated by Smart Healthcare for clinical reference.
                  <span class="page-number">Page ${pageIndex + 1} of ${prescriptionChunks.length}</span>
                </div>
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Prescription ${escapeHtml(appointmentId)}</title>
          <style>
            @page {
              size: A5 portrait;
              margin: 0;
            }

            * {
              box-sizing: border-box;
            }

             html,
             body {
               margin: 0;
               width: 100%;
               min-height: 100%;
               font-family: "Times New Roman", Georgia, serif;
               background: #ffffff;
               color: #111111;
              }

              .page {
                position: relative;
                width: 148mm;
                height: 210mm;
                padding: 6mm;
                overflow: hidden;
              }

              .page-break {
                page-break-after: always;
              }

              .sheet {
                position: relative;
                display: flex;
                flex-direction: column;
                width: 100%;
                height: 100%;
                border: 1.5px solid #111111;
                padding: 11mm 10mm 9mm;
                overflow: hidden;
              }

              .watermark {
                position: absolute;
                width: 210mm;
                text-align: center;
                font-size: 20px;
                letter-spacing: 0.28em;
                color: rgba(17, 17, 17, 0.09);
                transform: rotate(-34deg);
                transform-origin: center;
                white-space: nowrap;
                pointer-events: none;
                user-select: none;
              }

              .watermark-1 {
                left: -28mm;
                bottom: 22mm;
              }

              .watermark-2 {
                left: -16mm;
                bottom: 58mm;
              }

              .watermark-3 {
                left: -30mm;
                bottom: 94mm;
              }

              .watermark-4 {
                left: -18mm;
                bottom: 130mm;
              }

              .watermark-5 {
                left: -26mm;
                bottom: 166mm;
              }

             .header {
               position: relative;
               z-index: 1;
               border-bottom: 1px solid #111111;
               padding-bottom: 6mm;
               margin-bottom: 5mm;
             }

             .brand {
               margin: 0;
               text-align: center;
               font-size: 24px;
               font-weight: 500;
               letter-spacing: 0.04em;
             }

             .subtitle {
               margin: 4mm 0 0;
               text-align: center;
               font-size: 12px;
               font-weight: 400;
               letter-spacing: 0.16em;
               text-transform: uppercase;
             }

              .meta-row {
                display: flex;
                justify-content: space-between;
                gap: 8mm;
                margin-top: 4mm;
                font-size: 11px;
              }

              .content {
                position: relative;
                z-index: 1;
               flex: 1;
               display: flex;
               flex-direction: column;
               gap: 4mm;
               font-size: 13px;
               line-height: 1.55;
             }

              .section {
                border: 1px solid #111111;
                padding: 3.25mm;
              }

              .compact-section {
                padding-top: 3.5mm;
                padding-bottom: 3.5mm;
              }

              .section-title {
                margin: 0 0 2.25mm;
                font-size: 12px;
               font-weight: 500;
               letter-spacing: 0.12em;
               text-transform: uppercase;
             }

             .details-grid {
               display: grid;
               grid-template-columns: 1fr 1fr;
               gap: 2.5mm 6mm;
             }

             .detail-item {
               min-width: 0;
             }

              .detail-label {
                display: block;
                margin-bottom: 1mm;
                font-size: 10px;
                letter-spacing: 0.12em;
                text-transform: uppercase;
              }

              .detail-value {
                font-size: 13px;
                font-weight: 400;
                word-break: break-word;
              }

              .continuation-note {
                margin: 0;
                font-size: 12px;
              }

              table {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;
              }

              thead th {
                border-bottom: 1px solid #111111;
                padding: 0 0 2.5mm;
               font-size: 10px;
               font-weight: 500;
               letter-spacing: 0.12em;
               text-transform: uppercase;
                text-align: left;
              }

              .prescription-section {
                flex: 1;
                display: flex;
                flex-direction: column;
              }

              .prescription-table-wrap {
                flex: 1;
              }

              .prescription-table tbody tr {
                height: 10.75mm;
                border-bottom: 1px solid rgba(17, 17, 17, 0.28);
              }

              tbody td {
                padding: 2.25mm 1.25mm 2.25mm 0;
                vertical-align: middle;
                font-size: 12px;
                font-weight: 400;
                border-bottom: none;
              }

              .placeholder-row td {
                color: transparent;
              }

              .empty-row {
                padding: 5mm 0 1mm;
                text-align: center;
                color: #111111;
              }

              .footer-note {
                margin-top: auto;
                padding-top: 3mm;
                border-top: 1px solid #111111;
                font-size: 10px;
                line-height: 1.35;
                text-align: center;
              }

              .page-number {
                display: block;
                margin-top: 2mm;
              }
            </style>
          </head>
          <body>
            ${pagesMarkup}
           <script>
            window.onload = function () {
              window.focus();
              setTimeout(function () {
                window.print();
              }, 200);
            };

            window.onafterprint = function () {
              window.close();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    } catch (error) {
      console.error("Failed to generate prescription PDF:", error);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => {
        void handleGeneratePdf();
      }}
      disabled={isGenerating || !canDownload}
      title={
        canDownload
          ? "Download Prescription"
          : "Prescription will be available after the doctor saves it"
      }
      className={
        buttonClassName ||
        "inline-flex rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
      }
    >
      {isGenerating ? "Preparing PDF..." : "Download Prescription"}
    </button>
  );
}

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
  buttonClassName,
}: PrescriptionPdfGeneratorProps) {
  const [prescriptions, setPrescriptions] = useState<TelemedicinePrescription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadPrescriptions() {
      try {
        setLoading(true);
        const response = await getPrescriptionsByAppointmentId(appointmentId);

        if (isMounted) {
          setPrescriptions(response.data || []);
        }
      } catch (error) {
        console.error("Failed to load prescriptions for PDF:", error);
        if (isMounted) {
          setPrescriptions([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (appointmentId) {
      void loadPrescriptions();
    } else {
      setPrescriptions([]);
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [appointmentId]);

  function handleGeneratePdf() {
    const printWindow = window.open("", "_blank", "width=900,height=1200");

    if (!printWindow) {
      return;
    }

    const prescriptionLines =
      prescriptions.length > 0
        ? prescriptions
            .map(
              (prescription) => `
                <div style="margin-top: 12px; line-height: 1.7;">
                  <span>${escapeHtml(getSafeLabel(prescription.medicineName))}</span>
                  <span style="margin-left: 14px;">${escapeHtml(getSafeLabel(prescription.dosage))}</span>
                  <span style="margin-left: 14px;">${escapeHtml(getSafeLabel(prescription.instructions))}</span>
                </div>
              `
            )
            .join("")
        : `
            <div style="margin-top: 12px; line-height: 1.7;">
              No prescriptions available.
            </div>
          `;

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
              width: 148mm;
              height: 210mm;
              font-family: Arial, Helvetica, sans-serif;
              background: #ffffff;
              color: #2563eb;
            }

            .page {
              width: 148mm;
              height: 210mm;
              padding: 8mm;
            }

            .sheet {
              width: 100%;
              height: 100%;
              border: 4px solid #2563eb;
              padding: 18mm 14mm 16mm;
            }

            .title {
              margin: 0 0 28px;
              text-align: center;
              font-size: 28px;
              font-weight: 700;
              letter-spacing: 0.04em;
            }

            .content {
              text-align: left;
              font-size: 16px;
              line-height: 1.75;
            }

            .section-title {
              margin-top: 22px;
              font-weight: 700;
              text-decoration: underline;
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="sheet">
              <h1 class="title">SMART HELTHCARE</h1>
              <div class="content">
                <div>Specialization: ${escapeHtml(getSafeLabel(specialization))}</div>
                <div>Doctor Name: ${escapeHtml(getSafeLabel(doctorName))}</div>
                <div>Licen No: ${escapeHtml(getSafeLabel(licenseNumber))}</div>
                <div>Hospital: ${escapeHtml(getSafeLabel(hospitalName))}</div>

                <div style="margin-top: 20px;">Age: ${escapeHtml(getSafeLabel(patientAge))}</div>
                <div>Patient Name: ${escapeHtml(getSafeLabel(patientName))}</div>

                <div class="section-title">Prescriptions</div>
                ${prescriptionLines}
              </div>
            </div>
          </div>
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
  }

  return (
    <button
      type="button"
      onClick={handleGeneratePdf}
      disabled={loading}
      className={
        buttonClassName ||
        "inline-flex rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
      }
    >
      {loading ? "Preparing PDF..." : "Download Prescription"}
    </button>
  );
}

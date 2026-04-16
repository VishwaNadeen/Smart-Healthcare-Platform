export interface Report {
  _id: string;
  patientId: string;
  fileName: string;
  filePath: string;
  filePublicId: string;
  fileResourceType: string;
  reportType: string;
  reportTitle: string;
  providerName?: string;
  reportDate: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}
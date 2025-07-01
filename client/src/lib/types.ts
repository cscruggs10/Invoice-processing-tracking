export type InvoiceStatus = "pending_entry" | "pending_review" | "admin_review" | "approved" | "finalized" | "paid";

export interface VinLookupResult {
  found: boolean;
  database?: "wholesale_inventory" | "retail_inventory" | "sold" | "current_account";
  daysSinceUpdate?: number;
}

export interface DashboardStats {
  totalPending: number;
  readyToExport: number;
  todaysTotal: number;
  needReview: number;
}

export interface InvoiceFormData {
  vendorName: string;
  vendorNumber: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceAmount: number;
  vin: string;
  invoiceType: string;
  description?: string;
  dueDate: string;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  vendorName: string;
  vendorNumber: string;
  invoiceDate: Date;
  invoiceAmount: string;
  dueDate: Date;
  vin: string;
  invoiceType: string;
  description: string | null;
  uploadedBy: number;
  status: InvoiceStatus;
  glCode: string | null;
  enteredBy: number | null;
  approvedBy: number | null;
  finalizedBy: number | null;
  vinLookupResult: VinLookupResult | null;
  createdAt: Date;
  updatedAt: Date;
}

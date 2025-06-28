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

import { pgTable, text, serial, integer, boolean, timestamp, decimal, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"), // user, admin
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull(),
  vendorName: text("vendor_name").notNull(),
  vendorNumber: text("vendor_number").notNull(),
  invoiceDate: timestamp("invoice_date").notNull(),
  invoiceAmount: decimal("invoice_amount", { precision: 10, scale: 2 }).notNull(),
  dueDate: timestamp("due_date").notNull(),
  vin: text("vin").notNull(), // last 8 digits
  invoiceType: text("invoice_type").notNull(),
  description: text("description"),
  glCode: text("gl_code"),
  status: text("status").notNull().default("pending_entry"), // pending_entry, pending_review, admin_review, approved, finalized, paid
  uploadedBy: integer("uploaded_by").references(() => users.id).notNull(),
  enteredBy: integer("entered_by").references(() => users.id),
  approvedBy: integer("approved_by").references(() => users.id),
  finalizedBy: integer("finalized_by").references(() => users.id),
  vinLookupResult: json("vin_lookup_result"), // stores which database VIN was found in
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const uploadedFiles = pgTable("uploaded_files", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  filePath: text("file_path").notNull(),
  invoiceId: integer("invoice_id").references(() => invoices.id),
  uploadedBy: integer("uploaded_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").references(() => invoices.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  action: text("action").notNull(), // uploaded, entered, approved, finalized, etc.
  oldValues: json("old_values"),
  newValues: json("new_values"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// VIN lookup databases (simulated - in real app these would be separate tables)
export const wholesaleInventory = pgTable("wholesale_inventory", {
  id: serial("id").primaryKey(),
  vin: text("vin").notNull(),
  lastUpdated: timestamp("last_updated").notNull(),
});

export const retailInventory = pgTable("retail_inventory", {
  id: serial("id").primaryKey(),
  vin: text("vin").notNull(),
  lastUpdated: timestamp("last_updated").notNull(),
});

export const soldInventory = pgTable("sold_inventory", {
  id: serial("id").primaryKey(),
  vin: text("vin").notNull(),
  soldDate: timestamp("sold_date").notNull(),
});

export const currentAccount = pgTable("current_account", {
  id: serial("id").primaryKey(),
  vin: text("vin").notNull(),
  lastUpdated: timestamp("last_updated").notNull(),
});

export const csvExports = pgTable("csv_exports", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  exportDate: timestamp("export_date").notNull(),
  invoiceIds: json("invoice_ids").notNull(), // array of invoice IDs included
  exportedBy: integer("exported_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUploadedFileSchema = createInsertSchema(uploadedFiles).omit({
  id: true,
  createdAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLog).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type UploadedFile = typeof uploadedFiles.$inferSelect;
export type InsertUploadedFile = z.infer<typeof insertUploadedFileSchema>;
export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type CsvExport = typeof csvExports.$inferSelect;

export type InvoiceStatus = "pending_entry" | "pending_review" | "admin_review" | "approved" | "finalized" | "paid";
export type VinLookupResult = {
  found: boolean;
  database?: "wholesale_inventory" | "retail_inventory" | "sold" | "current_account";
  daysSinceUpdate?: number;
};

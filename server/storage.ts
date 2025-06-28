import { 
  users, invoices, uploadedFiles, auditLog, csvExports,
  wholesaleInventory, retailInventory, soldInventory, currentAccount,
  type User, type InsertUser, type Invoice, type InsertInvoice, 
  type UploadedFile, type InsertUploadedFile, type AuditLog, type InsertAuditLog,
  type CsvExport, type InvoiceStatus, type VinLookupResult
} from "@shared/schema";

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Invoice management
  getInvoices(filters?: {
    status?: InvoiceStatus[];
    userId?: number;
    startDate?: Date;
    endDate?: Date;
    vendorName?: string;
    invoiceNumber?: string;
    vin?: string;
  }): Promise<Invoice[]>;
  getInvoice(id: number): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, updates: Partial<Invoice>): Promise<Invoice>;
  updateInvoiceStatus(id: number, status: InvoiceStatus, userId: number): Promise<Invoice>;
  
  // File management
  createUploadedFile(file: InsertUploadedFile): Promise<UploadedFile>;
  getUploadedFile(id: number): Promise<UploadedFile | undefined>;
  getFilesByInvoice(invoiceId: number): Promise<UploadedFile[]>;
  
  // VIN lookup
  lookupVin(vin: string): Promise<VinLookupResult>;
  
  // Audit logging
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(invoiceId: number): Promise<AuditLog[]>;
  
  // CSV exports
  createCsvExport(exportData: Omit<CsvExport, 'id' | 'createdAt'>): Promise<CsvExport>;
  getCsvExports(): Promise<CsvExport[]>;
  
  // Dashboard stats
  getDashboardStats(): Promise<{
    totalPending: number;
    readyToExport: number;
    todaysTotal: number;
    needReview: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private invoices: Map<number, Invoice> = new Map();
  private uploadedFiles: Map<number, UploadedFile> = new Map();
  private auditLogs: Map<number, AuditLog> = new Map();
  private csvExports: Map<number, CsvExport> = new Map();
  private wholesaleVins: Map<string, { lastUpdated: Date }> = new Map();
  private retailVins: Map<string, { lastUpdated: Date }> = new Map();
  private soldVins: Map<string, { soldDate: Date }> = new Map();
  private currentAccountVins: Map<string, { lastUpdated: Date }> = new Map();
  
  private currentUserId = 1;
  private currentInvoiceId = 1;
  private currentFileId = 1;
  private currentAuditId = 1;
  private currentExportId = 1;

  constructor() {
    // Initialize with sample VIN data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Sample VINs for testing
    this.wholesaleVins.set("12345678", { lastUpdated: new Date() });
    this.wholesaleVins.set("11223344", { lastUpdated: new Date() });
    this.retailVins.set("87654321", { lastUpdated: new Date() });
    this.retailVins.set("44556677", { lastUpdated: new Date() });
    this.soldVins.set("99887766", { soldDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) });
    this.currentAccountVins.set("55443322", { lastUpdated: new Date() });
    
    // Create default admin user
    const adminUser: User = {
      id: this.currentUserId++,
      username: "admin",
      password: "admin123", // In real app, this would be hashed
      role: "admin",
      createdAt: new Date(),
    };
    this.users.set(adminUser.id, adminUser);
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      ...insertUser,
      id: this.currentUserId++,
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async getInvoices(filters?: {
    status?: InvoiceStatus[];
    userId?: number;
    startDate?: Date;
    endDate?: Date;
    vendorName?: string;
    invoiceNumber?: string;
    vin?: string;
  }): Promise<Invoice[]> {
    let invoices = Array.from(this.invoices.values());
    
    if (!filters) return invoices;
    
    if (filters.status) {
      invoices = invoices.filter(inv => filters.status!.includes(inv.status as InvoiceStatus));
    }
    
    if (filters.userId) {
      invoices = invoices.filter(inv => 
        inv.uploadedBy === filters.userId || 
        inv.enteredBy === filters.userId ||
        inv.approvedBy === filters.userId
      );
    }
    
    if (filters.vendorName) {
      invoices = invoices.filter(inv => 
        inv.vendorName.toLowerCase().includes(filters.vendorName!.toLowerCase())
      );
    }
    
    if (filters.invoiceNumber) {
      invoices = invoices.filter(inv => 
        inv.invoiceNumber.toLowerCase().includes(filters.invoiceNumber!.toLowerCase())
      );
    }
    
    if (filters.vin) {
      invoices = invoices.filter(inv => inv.vin.includes(filters.vin!));
    }
    
    if (filters.startDate) {
      invoices = invoices.filter(inv => inv.createdAt >= filters.startDate!);
    }
    
    if (filters.endDate) {
      invoices = invoices.filter(inv => inv.createdAt <= filters.endDate!);
    }
    
    return invoices.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getInvoice(id: number): Promise<Invoice | undefined> {
    return this.invoices.get(id);
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const invoice: Invoice = {
      ...insertInvoice,
      id: this.currentInvoiceId++,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.invoices.set(invoice.id, invoice);
    return invoice;
  }

  async updateInvoice(id: number, updates: Partial<Invoice>): Promise<Invoice> {
    const invoice = this.invoices.get(id);
    if (!invoice) throw new Error("Invoice not found");
    
    const updatedInvoice: Invoice = {
      ...invoice,
      ...updates,
      updatedAt: new Date(),
    };
    
    this.invoices.set(id, updatedInvoice);
    return updatedInvoice;
  }

  async updateInvoiceStatus(id: number, status: InvoiceStatus, userId: number): Promise<Invoice> {
    const invoice = this.invoices.get(id);
    if (!invoice) throw new Error("Invoice not found");
    
    const updates: Partial<Invoice> = { status };
    
    // Set appropriate user field based on status
    switch (status) {
      case "pending_review":
        updates.enteredBy = userId;
        break;
      case "approved":
        updates.approvedBy = userId;
        break;
      case "finalized":
        updates.finalizedBy = userId;
        break;
    }
    
    return this.updateInvoice(id, updates);
  }

  async createUploadedFile(insertFile: InsertUploadedFile): Promise<UploadedFile> {
    const file: UploadedFile = {
      ...insertFile,
      id: this.currentFileId++,
      createdAt: new Date(),
    };
    this.uploadedFiles.set(file.id, file);
    return file;
  }

  async getUploadedFile(id: number): Promise<UploadedFile | undefined> {
    return this.uploadedFiles.get(id);
  }

  async getFilesByInvoice(invoiceId: number): Promise<UploadedFile[]> {
    return Array.from(this.uploadedFiles.values())
      .filter(file => file.invoiceId === invoiceId);
  }

  async lookupVin(vin: string): Promise<VinLookupResult> {
    // Check wholesale inventory
    if (this.wholesaleVins.has(vin)) {
      const data = this.wholesaleVins.get(vin)!;
      const daysSinceUpdate = Math.floor((Date.now() - data.lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
      return {
        found: true,
        database: "wholesale_inventory",
        daysSinceUpdate,
      };
    }
    
    // Check retail inventory
    if (this.retailVins.has(vin)) {
      const data = this.retailVins.get(vin)!;
      const daysSinceUpdate = Math.floor((Date.now() - data.lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
      return {
        found: true,
        database: "retail_inventory",
        daysSinceUpdate,
      };
    }
    
    // Check sold inventory
    if (this.soldVins.has(vin)) {
      const data = this.soldVins.get(vin)!;
      const daysSinceUpdate = Math.floor((Date.now() - data.soldDate.getTime()) / (1000 * 60 * 60 * 24));
      return {
        found: true,
        database: "sold",
        daysSinceUpdate,
      };
    }
    
    // Check current account
    if (this.currentAccountVins.has(vin)) {
      const data = this.currentAccountVins.get(vin)!;
      const daysSinceUpdate = Math.floor((Date.now() - data.lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
      return {
        found: true,
        database: "current_account",
        daysSinceUpdate,
      };
    }
    
    return { found: false };
  }

  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const log: AuditLog = {
      ...insertLog,
      id: this.currentAuditId++,
      createdAt: new Date(),
    };
    this.auditLogs.set(log.id, log);
    return log;
  }

  async getAuditLogs(invoiceId: number): Promise<AuditLog[]> {
    return Array.from(this.auditLogs.values())
      .filter(log => log.invoiceId === invoiceId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createCsvExport(exportData: Omit<CsvExport, 'id' | 'createdAt'>): Promise<CsvExport> {
    const csvExport: CsvExport = {
      ...exportData,
      id: this.currentExportId++,
      createdAt: new Date(),
    };
    this.csvExports.set(csvExport.id, csvExport);
    return csvExport;
  }

  async getCsvExports(): Promise<CsvExport[]> {
    return Array.from(this.csvExports.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getDashboardStats(): Promise<{
    totalPending: number;
    readyToExport: number;
    todaysTotal: number;
    needReview: number;
  }> {
    const allInvoices = Array.from(this.invoices.values());
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todaysInvoices = allInvoices.filter(inv => 
      inv.createdAt >= today && inv.createdAt < tomorrow
    );
    
    return {
      totalPending: allInvoices.filter(inv => 
        ["pending_entry", "pending_review"].includes(inv.status)
      ).length,
      readyToExport: allInvoices.filter(inv => inv.status === "approved").length,
      todaysTotal: todaysInvoices.reduce((sum, inv) => 
        sum + parseFloat(inv.invoiceAmount.toString()), 0
      ),
      needReview: allInvoices.filter(inv => inv.status === "admin_review").length,
    };
  }
}

export const storage = new MemStorage();

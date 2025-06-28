import { 
  users, invoices, uploadedFiles, auditLog, csvExports,
  wholesaleInventory, retailInventory, soldInventory, currentAccount,
  type User, type InsertUser, type Invoice, type InsertInvoice, 
  type UploadedFile, type InsertUploadedFile, type AuditLog, type InsertAuditLog,
  type CsvExport, type InvoiceStatus, type VinLookupResult
} from "@shared/schema";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and, gte, lte, ilike, inArray, desc } from "drizzle-orm";

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

    // Create sample invoices for demonstration
    const sampleInvoices = [
      {
        invoiceNumber: "INV-2024-001",
        vendorName: "ABC Auto Parts",
        vendorNumber: "V001",
        invoiceDate: new Date("2024-06-20"),
        invoiceAmount: "1250.75",
        dueDate: new Date("2024-06-25"),
        vin: "12345678", // Will match wholesale inventory
        invoiceType: "Parts",
        description: "Brake pads and rotors",
        uploadedBy: adminUser.id,
        status: "pending_review" as const,
        glCode: "1400",
        enteredBy: adminUser.id,
        approvedBy: null,
        finalizedBy: null,
        vinLookupResult: { found: true, database: "wholesale_inventory" as const, daysSinceUpdate: 0 },
      },
      {
        invoiceNumber: "INV-2024-002", 
        vendorName: "XYZ Service Center",
        vendorNumber: "V002",
        invoiceDate: new Date("2024-06-21"),
        invoiceAmount: "850.00",
        dueDate: new Date("2024-06-26"),
        vin: "99887766", // Will match sold inventory - requires admin review
        invoiceType: "Service",
        description: "Oil change and inspection",
        uploadedBy: adminUser.id,
        status: "admin_review" as const,
        glCode: null,
        enteredBy: adminUser.id,
        approvedBy: null,
        finalizedBy: null,
        vinLookupResult: { found: true, database: "sold" as const, daysSinceUpdate: 45 },
      },
      {
        invoiceNumber: "INV-2024-003",
        vendorName: "Tire World",
        vendorNumber: "V003",
        invoiceDate: new Date("2024-06-22"),
        invoiceAmount: "650.25",
        dueDate: new Date("2024-06-27"),
        vin: "87654321", // Will match retail inventory
        invoiceType: "Tires",
        description: "Set of 4 new tires",
        uploadedBy: adminUser.id,
        status: "approved" as const,
        glCode: "1400",
        enteredBy: adminUser.id,
        approvedBy: adminUser.id,
        finalizedBy: null,
        vinLookupResult: { found: true, database: "retail_inventory" as const, daysSinceUpdate: 2 },
      },
      {
        invoiceNumber: "INV-2024-004",
        vendorName: "Elite Motors",
        vendorNumber: "V004",
        invoiceDate: new Date("2024-06-23"),
        invoiceAmount: "2150.00",
        dueDate: new Date("2024-06-28"),
        vin: "00000000", // Will not be found - requires admin review
        invoiceType: "Repair",
        description: "Engine diagnostic and repair",
        uploadedBy: adminUser.id,
        status: "admin_review" as const,
        glCode: null,
        enteredBy: adminUser.id,
        approvedBy: null,
        finalizedBy: null,
        vinLookupResult: { found: false },
      },
      {
        invoiceNumber: "INV-2024-005",
        vendorName: "Parts Plus",
        vendorNumber: "V005",
        invoiceDate: new Date(),
        invoiceAmount: "425.50",
        dueDate: new Date(),
        vin: "11223344", // Will match wholesale inventory
        invoiceType: "Parts",
        description: "Air filter and spark plugs",
        uploadedBy: adminUser.id,
        status: "pending_entry" as const,
        glCode: null,
        enteredBy: null,
        approvedBy: null,
        finalizedBy: null,
        vinLookupResult: null,
      },
    ];

    // Add sample invoices
    sampleInvoices.forEach(invoiceData => {
      const invoice: Invoice = {
        ...invoiceData,
        id: this.currentInvoiceId++,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.invoices.set(invoice.id, invoice);

      // Create audit log for each invoice
      const auditLog: AuditLog = {
        id: this.currentAuditId++,
        invoiceId: invoice.id,
        userId: adminUser.id,
        action: "created",
        oldValues: null,
        newValues: invoice,
        createdAt: new Date(),
      };
      this.auditLogs.set(auditLog.id, auditLog);
    });
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
      role: insertUser.role || "user",
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
      status: insertInvoice.status || "pending_entry",
      description: insertInvoice.description || null,
      glCode: insertInvoice.glCode || null,
      enteredBy: insertInvoice.enteredBy || null,
      approvedBy: insertInvoice.approvedBy || null,
      finalizedBy: insertInvoice.finalizedBy || null,
      vinLookupResult: insertInvoice.vinLookupResult || null,
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
      invoiceId: insertFile.invoiceId || null,
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
      oldValues: insertLog.oldValues || null,
      newValues: insertLog.newValues || null,
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

// Database storage implementation using Drizzle + Neon
export class DatabaseStorage implements IStorage {
  private db;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    
    const sql = neon(process.env.DATABASE_URL!);
    this.db = drizzle(sql);
  }

  async getUser(id: number): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values(insertUser).returning();
    return result[0];
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
    let query = this.db.select().from(invoices);
    
    const conditions = [];
    
    if (filters?.status) {
      conditions.push(inArray(invoices.status, filters.status));
    }
    
    if (filters?.userId) {
      conditions.push(
        eq(invoices.uploadedBy, filters.userId)
      );
    }
    
    if (filters?.vendorName) {
      conditions.push(ilike(invoices.vendorName, `%${filters.vendorName}%`));
    }
    
    if (filters?.invoiceNumber) {
      conditions.push(ilike(invoices.invoiceNumber, `%${filters.invoiceNumber}%`));
    }
    
    if (filters?.vin) {
      conditions.push(ilike(invoices.vin, `%${filters.vin}%`));
    }
    
    if (filters?.startDate) {
      conditions.push(gte(invoices.createdAt, filters.startDate));
    }
    
    if (filters?.endDate) {
      conditions.push(lte(invoices.createdAt, filters.endDate));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(invoices.createdAt));
  }

  async getInvoice(id: number): Promise<Invoice | undefined> {
    const result = await this.db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
    return result[0];
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const result = await this.db.insert(invoices).values(insertInvoice).returning();
    return result[0];
  }

  async updateInvoice(id: number, updates: Partial<Invoice>): Promise<Invoice> {
    const result = await this.db.update(invoices)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(invoices.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error("Invoice not found");
    }
    
    return result[0];
  }

  async updateInvoiceStatus(id: number, status: InvoiceStatus, userId: number): Promise<Invoice> {
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
    const result = await this.db.insert(uploadedFiles).values(insertFile).returning();
    return result[0];
  }

  async getUploadedFile(id: number): Promise<UploadedFile | undefined> {
    const result = await this.db.select().from(uploadedFiles).where(eq(uploadedFiles.id, id)).limit(1);
    return result[0];
  }

  async getFilesByInvoice(invoiceId: number): Promise<UploadedFile[]> {
    return this.db.select().from(uploadedFiles).where(eq(uploadedFiles.invoiceId, invoiceId));
  }

  async lookupVin(vin: string): Promise<VinLookupResult> {
    // Check wholesale inventory
    const wholesale = await this.db.select().from(wholesaleInventory).where(eq(wholesaleInventory.vin, vin)).limit(1);
    if (wholesale.length > 0) {
      const daysSinceUpdate = Math.floor((Date.now() - wholesale[0].lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
      return {
        found: true,
        database: "wholesale_inventory",
        daysSinceUpdate,
      };
    }
    
    // Check retail inventory
    const retail = await this.db.select().from(retailInventory).where(eq(retailInventory.vin, vin)).limit(1);
    if (retail.length > 0) {
      const daysSinceUpdate = Math.floor((Date.now() - retail[0].lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
      return {
        found: true,
        database: "retail_inventory",
        daysSinceUpdate,
      };
    }
    
    // Check sold inventory
    const sold = await this.db.select().from(soldInventory).where(eq(soldInventory.vin, vin)).limit(1);
    if (sold.length > 0) {
      const daysSinceUpdate = Math.floor((Date.now() - sold[0].soldDate.getTime()) / (1000 * 60 * 60 * 24));
      return {
        found: true,
        database: "sold",
        daysSinceUpdate,
      };
    }
    
    // Check current account
    const currentAcc = await this.db.select().from(currentAccount).where(eq(currentAccount.vin, vin)).limit(1);
    if (currentAcc.length > 0) {
      const daysSinceUpdate = Math.floor((Date.now() - currentAcc[0].lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
      return {
        found: true,
        database: "current_account",
        daysSinceUpdate,
      };
    }
    
    return { found: false };
  }

  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const result = await this.db.insert(auditLog).values(insertLog).returning();
    return result[0];
  }

  async getAuditLogs(invoiceId: number): Promise<AuditLog[]> {
    return this.db.select().from(auditLog)
      .where(eq(auditLog.invoiceId, invoiceId))
      .orderBy(desc(auditLog.createdAt));
  }

  async createCsvExport(exportData: Omit<CsvExport, 'id' | 'createdAt'>): Promise<CsvExport> {
    const result = await this.db.insert(csvExports).values(exportData).returning();
    return result[0];
  }

  async getCsvExports(): Promise<CsvExport[]> {
    return this.db.select().from(csvExports).orderBy(desc(csvExports.createdAt));
  }

  async getDashboardStats(): Promise<{
    totalPending: number;
    readyToExport: number;
    todaysTotal: number;
    needReview: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get all invoices for stats calculation
    const allInvoices = await this.db.select().from(invoices);
    
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

// Use memory storage for now (will switch to database when DATABASE_URL is properly configured)
export const storage = new MemStorage();

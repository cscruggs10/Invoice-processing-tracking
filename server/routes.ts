import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertInvoiceSchema, insertUploadedFileSchema, insertAuditLogSchema, insertVendorSchema, type InvoiceStatus } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // In a real app, you'd use proper session management
      res.json({ 
        user: { 
          id: user.id, 
          username: user.username, 
          role: user.role 
        } 
      });
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Vendor routes
  app.get("/api/vendors", async (req, res) => {
    try {
      const { search, active } = req.query;
      const filters: any = {};
      
      if (search) filters.search = search as string;
      if (active !== undefined) filters.active = active === 'true';
      
      const vendors = await storage.getVendors(filters);
      res.json(vendors);
    } catch (error) {
      console.error("Failed to fetch vendors:", error);
      res.status(500).json({ message: "Failed to fetch vendors" });
    }
  });

  app.get("/api/vendors/:id", async (req, res) => {
    try {
      const vendor = await storage.getVendor(parseInt(req.params.id));
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
      res.json(vendor);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch vendor" });
    }
  });

  app.post("/api/vendors", async (req, res) => {
    try {
      const validatedData = insertVendorSchema.parse(req.body);
      const vendor = await storage.createVendor(validatedData);
      res.status(201).json(vendor);
    } catch (error) {
      console.error("Failed to create vendor:", error);
      res.status(500).json({ message: "Failed to create vendor" });
    }
  });

  app.patch("/api/vendors/:id", async (req, res) => {
    try {
      const vendor = await storage.updateVendor(parseInt(req.params.id), req.body);
      res.json(vendor);
    } catch (error) {
      res.status(500).json({ message: "Failed to update vendor" });
    }
  });

  // Bulk import vendors from CSV
  app.post("/api/vendors/import", async (req, res) => {
    try {
      const { vendors } = req.body;
      const importedVendors = [];
      
      for (const vendorData of vendors) {
        try {
          // Check if vendor already exists
          const existing = await storage.getVendorByNumber(vendorData.vendorNumber);
          if (!existing) {
            const vendor = await storage.createVendor(vendorData);
            importedVendors.push(vendor);
          }
        } catch (error) {
          console.error(`Failed to import vendor ${vendorData.vendorNumber}:`, error);
        }
      }
      
      res.json({ 
        message: `Imported ${importedVendors.length} vendors`, 
        imported: importedVendors.length 
      });
    } catch (error) {
      console.error("Failed to import vendors:", error);
      res.status(500).json({ message: "Failed to import vendors" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Invoice routes
  app.get("/api/invoices", async (req, res) => {
    try {
      const { status, userId, startDate, endDate, vendorName, invoiceNumber, vin } = req.query;
      
      const filters: any = {};
      if (status) filters.status = (status as string).split(',') as InvoiceStatus[];
      if (userId) filters.userId = parseInt(userId as string);
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (vendorName) filters.vendorName = vendorName as string;
      if (invoiceNumber) filters.invoiceNumber = invoiceNumber as string;
      if (vin) filters.vin = vin as string;
      
      const invoices = await storage.getInvoices(filters);
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const invoice = await storage.getInvoice(id);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  app.post("/api/invoices", async (req, res) => {
    try {
      console.log("Creating invoice with request body:", req.body);
      
      // Convert date strings to Date objects before validation
      const requestData = {
        ...req.body,
        invoiceDate: new Date(req.body.invoiceDate),
        dueDate: new Date(req.body.dueDate),
      };
      const invoiceData = insertInvoiceSchema.parse(requestData);
      
      console.log("Parsed invoice data:", invoiceData);
      console.log("Status from frontend:", invoiceData.status);
      
      // Use the status provided from the frontend
      // VIN lookup and GL code assignment now happens during export process
      let glCode = invoiceData.glCode || null;
      let status: InvoiceStatus = (invoiceData.status as InvoiceStatus) || "pending_review";
      let vinLookup = invoiceData.vinLookupResult || { found: false };
      
      console.log("Final status to use:", status);
      
      if (invoiceData.vin === "PENDING" || invoiceData.vendorName === "Pending Entry") {
        // This is an uploaded invoice awaiting data entry
        status = "pending_entry";
        vinLookup = { found: false };
        console.log("Override status for uploaded invoice:", status);
      }
      
      const invoice = await storage.createInvoice({
        ...invoiceData,
        glCode,
        status,
        vinLookupResult: vinLookup,
      });
      
      // Create audit log
      await storage.createAuditLog({
        invoiceId: invoice.id,
        userId: invoiceData.uploadedBy,
        action: "created",
        newValues: invoice,
      });
      
      res.json(invoice);
    } catch (error) {
      console.error("Invoice creation error:", error);
      res.status(400).json({ message: "Failed to create invoice" });
    }
  });

  app.patch("/api/invoices/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, userId } = req.body;
      
      const oldInvoice = await storage.getInvoice(id);
      if (!oldInvoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      const updatedInvoice = await storage.updateInvoiceStatus(id, status, userId);
      
      // Create audit log
      await storage.createAuditLog({
        invoiceId: id,
        userId,
        action: `status_changed_to_${status}`,
        oldValues: { status: oldInvoice.status },
        newValues: { status: updatedInvoice.status },
      });
      
      res.json(updatedInvoice);
    } catch (error) {
      res.status(400).json({ message: "Failed to update invoice status" });
    }
  });

  app.patch("/api/invoices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const oldInvoice = await storage.getInvoice(id);
      if (!oldInvoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      const updatedInvoice = await storage.updateInvoice(id, updates);
      
      // Create audit log
      await storage.createAuditLog({
        invoiceId: id,
        userId: updates.userId || oldInvoice.uploadedBy,
        action: "updated",
        oldValues: oldInvoice,
        newValues: updatedInvoice,
      });
      
      res.json(updatedInvoice);
    } catch (error) {
      res.status(400).json({ message: "Failed to update invoice" });
    }
  });

  // VIN lookup
  app.get("/api/vin-lookup/:vin", async (req, res) => {
    try {
      const vin = req.params.vin;
      const result = await storage.lookupVin(vin);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "VIN lookup failed" });
    }
  });

  // File upload
  app.post("/api/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const fileData = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        filePath: req.file.path,
        uploadedBy: parseInt(req.body.userId),
        invoiceId: req.body.invoiceId ? parseInt(req.body.invoiceId) : null,
      };
      
      const uploadedFile = await storage.createUploadedFile(fileData);
      res.json(uploadedFile);
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ message: "File upload failed" });
    }
  });

  // Get files for invoice
  app.get("/api/invoices/:id/files", async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const files = await storage.getFilesByInvoice(invoiceId);
      res.json(files);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch files" });
    }
  });

  // Update uploaded file with invoice ID
  app.patch("/api/files/:id/invoice", async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const { invoiceId } = req.body;
      
      const file = await storage.getUploadedFile(fileId);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Update the file with the invoice ID
      const updatedFile = await storage.updateUploadedFile(fileId, { invoiceId });
      res.json(updatedFile);
    } catch (error) {
      res.status(500).json({ message: "Failed to update file" });
    }
  });

  // Serve uploaded files
  app.get("/api/files/:id", async (req, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const file = await storage.getUploadedFile(fileId);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      if (!fs.existsSync(file.filePath)) {
        return res.status(404).json({ message: "File not found on disk" });
      }
      
      res.sendFile(path.resolve(file.filePath));
    } catch (error) {
      res.status(500).json({ message: "Failed to serve file" });
    }
  });

  // Billing Lines Routes
  app.get("/api/invoices/:id/billing-lines", async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const billingLines = await storage.getBillingLinesByInvoice(invoiceId);
      res.json(billingLines);
    } catch (error) {
      res.status(500).json({ message: "Failed to get billing lines" });
    }
  });

  app.post("/api/billing-lines", async (req, res) => {
    try {
      const billingLine = await storage.createBillingLine(req.body);
      res.json(billingLine);
    } catch (error) {
      res.status(500).json({ message: "Failed to create billing line" });
    }
  });

  app.patch("/api/billing-lines/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const billingLine = await storage.updateBillingLine(id, updates);
      res.json(billingLine);
    } catch (error) {
      res.status(500).json({ message: "Failed to update billing line" });
    }
  });

  app.delete("/api/billing-lines/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteBillingLine(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete billing line" });
    }
  });

  // CSV Export
  app.post("/api/export/csv", async (req, res) => {
    try {
      const { userId } = req.body;
      
      // Get approved invoices
      const invoices = await storage.getInvoices({ status: ["approved"] });
      
      if (invoices.length === 0) {
        return res.status(400).json({ message: "No approved invoices to export" });
      }
      
      // Generate CSV content
      const csvHeader = "Vendor Name,Vendor #,Invoice #,Invoice Date,Invoice Amount,Due Date,G/L#,Invoice Type,Description\n";
      const csvRows = invoices.map(inv => {
        const invoiceDate = inv.invoiceDate.toISOString().split('T')[0];
        const dueDate = inv.dueDate.toISOString().split('T')[0];
        return `"${inv.vendorName}","${inv.vendorNumber}","${inv.invoiceNumber}","${invoiceDate}","${inv.invoiceAmount}","${dueDate}","${inv.glCode || ''}","${inv.invoiceType}","${inv.description || ''}"`;
      }).join('\n');
      
      const csvContent = csvHeader + csvRows;
      
      // Create export record
      const today = new Date().toISOString().split('T')[0];
      const filename = `daily_upload_${today}.csv`;
      
      await storage.createCsvExport({
        filename,
        exportDate: new Date(),
        invoiceIds: invoices.map(inv => inv.id),
        exportedBy: userId,
      });
      
      // Mark invoices as finalized
      for (const invoice of invoices) {
        await storage.updateInvoiceStatus(invoice.id, "finalized", userId);
      }
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);
    } catch (error) {
      console.error("CSV export error:", error);
      res.status(500).json({ message: "CSV export failed" });
    }
  });

  // Get export history
  app.get("/api/exports", async (req, res) => {
    try {
      const exports = await storage.getCsvExports();
      res.json(exports);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch export history" });
    }
  });

  // Audit logs
  app.get("/api/invoices/:id/audit", async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const logs = await storage.getAuditLogs(invoiceId);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertInvoiceSchema, insertUploadedFileSchema, insertAuditLogSchema, insertVendorSchema, type InvoiceStatus } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { cloudinaryUpload } from "./cloudinary";

// Configure multer for local file uploads (fallback when Cloudinary is not configured)
const localUpload = multer({
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

// Use Cloudinary if configured, otherwise use local storage
const upload = process.env.CLOUDINARY_CLOUD_NAME ? cloudinaryUpload : localUpload;

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
      
      // Convert date strings to Date objects for Drizzle
      const processedUpdates = { ...updates };
      if (processedUpdates.invoiceDate && typeof processedUpdates.invoiceDate === 'string') {
        processedUpdates.invoiceDate = new Date(processedUpdates.invoiceDate);
      }
      if (processedUpdates.dueDate && typeof processedUpdates.dueDate === 'string') {
        processedUpdates.dueDate = new Date(processedUpdates.dueDate);
      }
      if (processedUpdates.invoiceAmount !== undefined) {
        processedUpdates.invoiceAmount = processedUpdates.invoiceAmount.toString();
      }
      
      const oldInvoice = await storage.getInvoice(id);
      if (!oldInvoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      const updatedInvoice = await storage.updateInvoice(id, processedUpdates);
      
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
      console.error("Error updating invoice:", error);
      res.status(400).json({ message: "Failed to update invoice", error: error.message });
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

  // File upload endpoint
  app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      console.log("Upload endpoint called");
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      console.log("File uploaded:", req.file);

      // Get the file URL based on storage type
      let fileUrl = '';
      let filename = '';
      
      if (process.env.CLOUDINARY_CLOUD_NAME && (req.file as any).path) {
        // Cloudinary upload - file.path contains the Cloudinary URL
        fileUrl = (req.file as any).path;
        filename = (req.file as any).public_id || req.file.filename;
      } else if (req.file.path) {
        // Local storage
        fileUrl = req.file.path;
        filename = req.file.filename;
      } else {
        // Fallback
        fileUrl = `temp_${req.file.filename}`;
        filename = req.file.filename;
      }

      // Create uploaded file record in database
      const uploadedFileData = {
        filename: filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        filePath: fileUrl, // This now stores the Cloudinary URL
        uploadedBy: 1, // TODO: Get from session
      };

      const uploadedFile = await storage.createUploadedFile(uploadedFileData);
      
      // Clean up temp file if using local storage and on Vercel
      if (!process.env.CLOUDINARY_CLOUD_NAME && process.env.VERCEL && req.file.path) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error("Error deleting temp file:", err);
        });
      }
      
      res.json(uploadedFile);
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ message: "File upload failed", error: error.message });
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
      const { download } = req.query; // Check if download is explicitly requested
      const file = await storage.getUploadedFile(fileId);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      if (!fs.existsSync(file.filePath)) {
        return res.status(404).json({ message: "File not found on disk" });
      }
      
      // Set proper headers for inline viewing or download
      res.setHeader('Content-Type', file.mimeType);
      
      if (download === 'true') {
        // Force download with original filename
        res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
      } else {
        // Display inline in browser (for PDFs, images, etc.)
        res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`);
        
        // Add cache headers for better performance
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
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

  // CSV Export with Batch Tracking
  app.post("/api/export/csv", async (req, res) => {
    try {
      const { userId } = req.body;
      
      // Get approved invoices
      const invoices = await storage.getInvoices({ status: ["approved"] });
      
      if (invoices.length === 0) {
        return res.status(400).json({ message: "No approved invoices to export" });
      }
      
      // Create export batch record
      const today = new Date().toISOString().split('T')[0];
      const filename = `daily_upload_${today}.csv`;
      
      const exportBatch = await storage.createExportBatch({
        filename,
        exportDate: new Date(), 
        totalInvoices: invoices.length,
        pendingVerification: invoices.length,
        exportedBy: userId,
        status: "awaiting_verification"
      });
      
      // Update invoices to 'exported' status and link to batch
      for (const invoice of invoices) {
        await storage.updateInvoice(invoice.id, {
          status: "exported",
          exportBatchId: exportBatch.id
        });
      }
      
      // Generate CSV content with leading zero preservation
      const csvHeader = "Vendor Name,Vendor #,Invoice #,Invoice Date,Invoice Amount,Due Date,G/L#,Invoice Type,Description\n";
      const csvRows = invoices.map(inv => {
        const invoiceDate = inv.invoiceDate.toISOString().split('T')[0];
        const dueDate = inv.dueDate.toISOString().split('T')[0];
        
        // Helper function to preserve leading zeros for Excel
        const preserveLeadingZeros = (value: string) => {
          if (!value) return '""';
          // Check if the value starts with 0 and contains digits (leading zero pattern)
          if (value.startsWith('0') && /^\d+$/.test(value)) {
            return `"=""${value}"""`;  // Excel formula approach: ="00110104250"
          }
          return `"${value}"`;
        };
        
        return [
          `"${inv.vendorName}"`,
          preserveLeadingZeros(inv.vendorNumber),
          preserveLeadingZeros(inv.invoiceNumber), 
          `"${invoiceDate}"`,
          `"${inv.invoiceAmount}"`,
          `"${dueDate}"`,
          preserveLeadingZeros(inv.glCode || ''),
          `"${inv.invoiceType}"`,
          `"${inv.description || ''}"`
        ].join(',');
      }).join('\n');
      
      // Add UTF-8 BOM for proper Excel handling
      const BOM = '\uFEFF';
      const csvContent = BOM + csvHeader + csvRows;
      
      // Create legacy CSV export record for history
      await storage.createCsvExport({
        filename,
        exportDate: new Date(),
        invoiceIds: invoices.map(inv => inv.id),
        exportedBy: userId,
      });
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
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

  // Export Batch Management
  app.get("/api/export-batches", async (req, res) => {
    try {
      const { status } = req.query;
      const batches = await storage.getExportBatches({ 
        status: status as string 
      });
      res.json(batches);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch export batches" });
    }
  });

  app.get("/api/export-batches/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const batch = await storage.getExportBatch(id);
      if (!batch) {
        return res.status(404).json({ message: "Export batch not found" });
      }
      res.json(batch);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch export batch" });
    }
  });

  app.patch("/api/export-batches/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const batch = await storage.updateExportBatch(id, updates);
      res.json(batch);
    } catch (error) {
      res.status(500).json({ message: "Failed to update export batch" });
    }
  });

  // Verify Export Batch (Bulk Success)
  app.post("/api/export-batches/:id/verify-success", async (req, res) => {
    try {
      const batchId = parseInt(req.params.id);
      const { userId } = req.body;
      
      const batch = await storage.getExportBatch(batchId);
      if (!batch) {
        return res.status(404).json({ message: "Export batch not found" });
      }
      
      // Get all invoices in this batch
      const allInvoices = await storage.getInvoices({ status: ["exported"] });
      const batchInvoices = allInvoices.filter(inv => inv.exportBatchId === batchId);
      
      // Update all invoices to 'filed' status
      for (const invoice of batchInvoices) {
        await storage.updateInvoice(invoice.id, {
          status: "filed",
          filedAt: new Date()
        });
      }
      
      // Update batch status
      await storage.updateExportBatch(batchId, {
        status: "completed",
        verifiedCount: batch.totalInvoices,
        pendingVerification: 0,
        verifiedAt: new Date()
      });
      
      res.json({ success: true, verifiedCount: batchInvoices.length });
    } catch (error) {
      console.error("Batch verification error:", error);
      res.status(500).json({ message: "Failed to verify export batch" });
    }
  });

  // Mark Individual Invoice as Failed
  app.post("/api/invoices/:id/mark-import-failed", async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const { failureReason, userId } = req.body;
      
      const invoice = await storage.updateInvoice(invoiceId, {
        status: "import_failed",
        importFailureReason: failureReason
      });
      
      // Update batch counts if invoice has a batch
      if (invoice.exportBatchId) {
        const batch = await storage.getExportBatch(invoice.exportBatchId);
        if (batch) {
          await storage.updateExportBatch(invoice.exportBatchId, {
            failedCount: batch.failedCount + 1,
            pendingVerification: batch.pendingVerification - 1,
            status: batch.pendingVerification - 1 === 0 ? "completed" : "partially_failed"
          });
        }
      }
      
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark invoice as failed" });
    }
  });

  // Return Failed Invoice to Approved Status
  app.post("/api/invoices/:id/return-to-approved", async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const { correctionNotes, userId } = req.body;
      
      const invoice = await storage.updateInvoice(invoiceId, {
        status: "approved",
        importFailureReason: null,
        importNotes: correctionNotes,
        exportBatchId: null // Remove from previous batch
      });
      
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ message: "Failed to return invoice to approved status" });
    }
  });

  // Get Failed Invoices - fixed version
  app.get("/api/invoices/import-failed", async (req, res) => {
    try {
      const failedInvoices = await storage.getInvoices({ 
        status: ["import_failed"] 
      });
      res.json(failedInvoices);
    } catch (error) {
      console.error("Failed invoices error:", error);
      // Return empty array instead of error to prevent cascading failures
      res.json([]);
    }
  });

  // Simple search endpoint for filed invoices
  app.get("/api/search", async (req, res) => {
    try {
      const { q } = req.query;
      const searchTerm = q as string;
      
      if (!searchTerm || searchTerm.trim().length === 0) {
        return res.json({ results: [], message: "Please enter a search term", total: 0 });
      }

      // Get all filed invoices
      const filedInvoices = await storage.getInvoices({ status: ["filed"] });
      
      // Simple text search across multiple fields
      const searchLower = searchTerm.toLowerCase().trim();
      const results = filedInvoices.filter(invoice => 
        invoice.vendorName?.toLowerCase().includes(searchLower) ||
        invoice.invoiceNumber?.toLowerCase().includes(searchLower) ||
        invoice.description?.toLowerCase().includes(searchLower) ||
        invoice.vin?.toLowerCase().includes(searchLower) ||
        invoice.vendorNumber?.toLowerCase().includes(searchLower)
      );

      res.json({
        results,
        total: results.length,
        message: results.length > 0 
          ? `Found ${results.length} invoice${results.length === 1 ? '' : 's'} matching "${searchTerm}"`
          : `No invoices found matching "${searchTerm}"`
      });
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ message: "Search failed", results: [], total: 0 });
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

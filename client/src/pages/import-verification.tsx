import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle, 
  AlertTriangle, 
  Upload, 
  FileSpreadsheet, 
  Eye, 
  Clock,
  FileText,
  X,
  Download
} from "lucide-react";

interface ExportBatch {
  id: number;
  filename: string;
  exportDate: string;
  totalInvoices: number;
  pendingVerification: number;
  verifiedCount: number;
  failedCount: number;
  status: "awaiting_verification" | "completed" | "partially_failed";
  verificationDocumentPath?: string;
  exportedBy: number;
  verifiedAt?: string;
  createdAt: string;
}

interface BatchInvoice {
  id: number;
  invoiceNumber: string;
  vendorName: string;
  invoiceAmount: string;
  status: string;
  importFailureReason?: string;
}

export default function ImportVerification() {
  const [batches, setBatches] = useState<ExportBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<ExportBatch | null>(null);
  const [batchInvoices, setBatchInvoices] = useState<BatchInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<number | null>(null);

  const { toast } = useToast();

  React.useEffect(() => {
    fetchExportBatches();
  }, []);

  const fetchExportBatches = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/export-batches?status=awaiting_verification');
      const data = await response.json();
      setBatches(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch export batches",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkVerifySuccess = async (batchId: number) => {
    try {
      const response = await fetch(`/api/export-batches/${batchId}/verify-success`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 1 }) // TODO: Get from auth context
      });

      if (!response.ok) {
        throw new Error('Verification failed');
      }

      const result = await response.json();
      
      toast({
        title: "Verification Successful",
        description: `${result.verifiedCount} invoices have been filed successfully`,
      });

      fetchExportBatches();
    } catch (error) {
      toast({
        title: "Verification Failed",
        description: "Failed to verify export batch",
        variant: "destructive",
      });
    }
  };

  const handleUploadDocument = async (batchId: number, file: File) => {
    try {
      setUploadingDoc(batchId);
      
      // For now, just simulate upload - tomorrow we'll add actual file processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Document Uploaded",
        description: `${file.name} uploaded successfully. File processing will be implemented tomorrow.`,
      });

      // Update batch with document path
      await fetch(`/api/export-batches/${batchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          verificationDocumentPath: `uploads/verification/${file.name}` 
        })
      });

      fetchExportBatches();
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload verification document",
        variant: "destructive",
      });
    } finally {
      setUploadingDoc(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "awaiting_verification":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800">Awaiting Verification</Badge>;
      case "completed":
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case "partially_failed":
        return <Badge variant="destructive">Partially Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "awaiting_verification":
        return <Clock className="h-4 w-4 text-amber-600" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "partially_failed":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const pendingCount = batches.filter(b => b.status === "awaiting_verification").length;
  const totalPendingInvoices = batches.reduce((sum, b) => sum + b.pendingVerification, 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 skeleton"></div>
          <Card className="modern-card animate-pulse">
            <CardContent className="p-6">
              <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded skeleton"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Import Verification</h1>
        <p className="text-muted-foreground mt-2">Verify that exported invoices were successfully imported into the external system</p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="modern-card hover-lift border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pending Batches</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card hover-lift border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{totalPendingInvoices}</p>
                <p className="text-sm text-muted-foreground">Pending Invoices</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card hover-lift border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <FileSpreadsheet className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">Excel/PDF</p>
                <p className="text-sm text-muted-foreground">Import Results</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Batches */}
      <Card className="modern-card border-0">
        <CardHeader className="border-b border-gray-100 dark:border-gray-800">
          <CardTitle className="text-xl flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-purple-600" />
            Export Batches Awaiting Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {batches.length > 0 ? (
            <div className="space-y-4">
              {batches.map((batch, index) => (
                <div 
                  key={batch.id}
                  className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover-lift transition-all animate-fadeIn"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(batch.status)}
                      <div>
                        <h3 className="font-semibold text-lg">{batch.filename}</h3>
                        <p className="text-sm text-muted-foreground">
                          Exported {new Date(batch.exportDate).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(batch.status)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{batch.totalInvoices}</p>
                      <p className="text-xs text-muted-foreground">Total Invoices</p>
                    </div>
                    <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-lg">
                      <p className="text-2xl font-bold text-amber-600">{batch.pendingVerification}</p>
                      <p className="text-xs text-muted-foreground">Pending</p>
                    </div>
                    <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{batch.verifiedCount}</p>
                      <p className="text-xs text-muted-foreground">Verified</p>
                    </div>
                    <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-lg">
                      <p className="text-2xl font-bold text-red-600">{batch.failedCount}</p>
                      <p className="text-xs text-muted-foreground">Failed</p>
                    </div>
                  </div>

                  {/* Verification Actions */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-2">Upload Import Result:</p>
                      <div className="flex gap-2">
                        <input
                          type="file"
                          accept=".xlsx,.xls,.pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleUploadDocument(batch.id, file);
                            }
                          }}
                          className="hidden"
                          id={`file-${batch.id}`}
                        />
                        <label
                          htmlFor={`file-${batch.id}`}
                          className="btn-modern bg-blue-600 hover:bg-blue-700 text-white hover-lift cursor-pointer px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
                        >
                          <Upload className="h-4 w-4" />
                          {uploadingDoc === batch.id ? "Uploading..." : "Upload Document"}
                        </label>
                        {batch.verificationDocumentPath && (
                          <Button variant="outline" size="sm" className="hover-lift">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleBulkVerifySuccess(batch.id)}
                        className="btn-modern bg-green-600 hover:bg-green-700 text-white hover-lift"
                        disabled={batch.pendingVerification === 0}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Verify All Success
                      </Button>
                      <Button
                        variant="outline"
                        className="hover-lift"
                        onClick={() => {
                          setSelectedBatch(batch);
                          // TODO: Load individual invoices for this batch
                        }}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Individual Review
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full w-fit mx-auto mb-6">
                <CheckCircle className="h-12 w-12 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                All Exports Verified
              </h3>
              <p className="text-muted-foreground">
                No export batches are currently awaiting verification
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card className="modern-card border-0 gradient-subtle">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-purple-600" />
            How to Verify Imports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-semibold text-xs flex-shrink-0 mt-0.5">1</div>
              <p><strong>Check External System:</strong> Review import results in your external accounting system</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-semibold text-xs flex-shrink-0 mt-0.5">2</div>
              <p><strong>Upload Results:</strong> Upload the import result file (Excel, PDF, or image) if available</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-semibold text-xs flex-shrink-0 mt-0.5">3</div>
              <p><strong>Bulk Verify:</strong> If all invoices imported successfully, click "Verify All Success"</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-semibold text-xs flex-shrink-0 mt-0.5">4</div>
              <p><strong>Individual Review:</strong> If some invoices failed, use "Individual Review" to mark specific failures</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
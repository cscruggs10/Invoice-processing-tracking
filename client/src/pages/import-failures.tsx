import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertTriangle, 
  CheckCircle, 
  Edit, 
  RotateCcw,
  FileText,
  DollarSign,
  Calendar,
  User
} from "lucide-react";

interface FailedInvoice {
  id: number;
  invoiceNumber: string;
  vendorName: string;
  vendorNumber: string;
  invoiceAmount: string;
  invoiceDate: string;
  vin: string;
  importFailureReason?: string;
  importNotes?: string;
  exportBatchId?: number;
  createdAt: string;
}

export default function ImportFailures() {
  const [failedInvoices, setFailedInvoices] = useState<FailedInvoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<FailedInvoice | null>(null);
  const [correctionNotes, setCorrectionNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const { toast } = useToast();

  React.useEffect(() => {
    fetchFailedInvoices();
  }, []);

  const fetchFailedInvoices = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/invoices/import-failed');
      const data = await response.json();
      setFailedInvoices(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch failed invoices",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReturnToApproved = async (invoiceId: number) => {
    try {
      setIsUpdating(true);
      const response = await fetch(`/api/invoices/${invoiceId}/return-to-approved`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          correctionNotes,
          userId: 1 // TODO: Get from auth context
        })
      });

      if (!response.ok) {
        throw new Error('Failed to return invoice to approved status');
      }

      toast({
        title: "Invoice Returned",
        description: "Invoice has been returned to approved status and will be included in the next export",
      });

      setSelectedInvoice(null);
      setCorrectionNotes("");
      fetchFailedInvoices();
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to return invoice to approved status",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getFailureReasonColor = (reason?: string) => {
    if (!reason) return "text-gray-500";
    
    if (reason.toLowerCase().includes("duplicate")) return "text-orange-600";
    if (reason.toLowerCase().includes("validation")) return "text-red-600";
    if (reason.toLowerCase().includes("amount")) return "text-purple-600";
    if (reason.toLowerCase().includes("vendor")) return "text-blue-600";
    return "text-gray-600";
  };

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
        <h1 className="text-3xl font-bold gradient-text">Import Failures</h1>
        <p className="text-muted-foreground mt-2">Manage invoices that failed to import into the external system</p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="modern-card hover-lift border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{failedInvoices.length}</p>
                <p className="text-sm text-muted-foreground">Failed Imports</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card hover-lift border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">
                  ${failedInvoices.reduce((sum, inv) => sum + parseFloat(inv.invoiceAmount), 0).toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">Total Value</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card hover-lift border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <RotateCcw className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">Correction</p>
                <p className="text-sm text-muted-foreground">Required</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Failed Invoices List */}
      <Card className="modern-card border-0">
        <CardHeader className="border-b border-gray-100 dark:border-gray-800">
          <CardTitle className="text-xl flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Failed Import Invoices
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {failedInvoices.length > 0 ? (
            <div className="space-y-4">
              {failedInvoices.map((invoice, index) => (
                <div 
                  key={invoice.id}
                  className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover-lift transition-all animate-fadeIn border-l-4 border-red-500"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-lg">{invoice.invoiceNumber}</h3>
                        <p className="text-sm text-muted-foreground">{invoice.vendorName}</p>
                      </div>
                    </div>
                    <Badge variant="destructive">Import Failed</Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Amount</p>
                      <p className="font-semibold text-green-600">${invoice.invoiceAmount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-semibold">{new Date(invoice.invoiceDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">VIN</p>
                      <p className="font-mono text-sm">{invoice.vin}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Vendor #</p>
                      <p className="font-semibold">{invoice.vendorNumber}</p>
                    </div>
                  </div>

                  {invoice.importFailureReason && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">Failure Reason:</p>
                      <p className={`text-sm ${getFailureReasonColor(invoice.importFailureReason)}`}>
                        {invoice.importFailureReason}
                      </p>
                    </div>
                  )}

                  {invoice.importNotes && (
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">Previous Notes:</p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">{invoice.importNotes}</p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      variant="outline"
                      className="hover-lift"
                      onClick={() => setSelectedInvoice(invoice)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Correct & Return to Queue
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full w-fit mx-auto mb-6">
                <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No Failed Imports
              </h3>
              <p className="text-muted-foreground">
                All invoices have been successfully imported or are pending verification
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Correction Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="modern-card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="border-b border-gray-100 dark:border-gray-800">
              <CardTitle className="text-xl flex items-center gap-2">
                <Edit className="h-5 w-5 text-purple-600" />
                Correct Invoice: {selectedInvoice.invoiceNumber}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Invoice Details */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div>
                    <Label className="text-sm text-muted-foreground">Vendor</Label>
                    <p className="font-semibold">{selectedInvoice.vendorName}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Amount</Label>
                    <p className="font-semibold text-green-600">${selectedInvoice.invoiceAmount}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Date</Label>
                    <p className="font-semibold">{new Date(selectedInvoice.invoiceDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">VIN</Label>
                    <p className="font-mono text-sm">{selectedInvoice.vin}</p>
                  </div>
                </div>

                {/* Failure Reason */}
                {selectedInvoice.importFailureReason && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <Label className="text-sm font-medium text-red-800 dark:text-red-200">Current Failure Reason:</Label>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">{selectedInvoice.importFailureReason}</p>
                  </div>
                )}

                {/* Correction Notes */}
                <div className="space-y-2">
                  <Label htmlFor="correctionNotes">Correction Notes</Label>
                  <Textarea
                    id="correctionNotes"
                    placeholder="Describe what was corrected or what action was taken..."
                    value={correctionNotes}
                    onChange={(e) => setCorrectionNotes(e.target.value)}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    These notes will be saved with the invoice for future reference.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedInvoice(null);
                      setCorrectionNotes("");
                    }}
                    disabled={isUpdating}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleReturnToApproved(selectedInvoice.id)}
                    disabled={isUpdating || !correctionNotes.trim()}
                    className="btn-modern bg-green-600 hover:bg-green-700 text-white hover-lift"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    {isUpdating ? "Returning..." : "Return to Approved Queue"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Instructions Card */}
      <Card className="modern-card border-0 gradient-subtle">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Handling Import Failures
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-semibold text-xs flex-shrink-0 mt-0.5">1</div>
              <p><strong>Review Failure Reason:</strong> Check why the invoice failed to import (duplicate, validation error, etc.)</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-semibold text-xs flex-shrink-0 mt-0.5">2</div>
              <p><strong>Correct the Issue:</strong> Fix the problem in your external system or invoice data</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-semibold text-xs flex-shrink-0 mt-0.5">3</div>
              <p><strong>Add Notes:</strong> Document what was corrected for future reference</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-semibold text-xs flex-shrink-0 mt-0.5">4</div>
              <p><strong>Return to Queue:</strong> Click "Return to Approved Queue" to include in the next export</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, Check, X, Filter, CheckCheck } from "lucide-react";
import { useInvoices, useUpdateInvoiceStatus } from "@/hooks/use-invoices";
import { ReviewModal } from "@/components/modals/review-modal";
import type { Invoice } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function Review() {
  const [selectedInvoices, setSelectedInvoices] = useState<number[]>([]);
  const [reviewModalInvoice, setReviewModalInvoice] = useState<Invoice | null>(null);
  
  const { data: invoices, isLoading } = useInvoices({ 
    status: ["pending_review"] 
  });
  const updateInvoiceStatus = useUpdateInvoiceStatus();
  const { toast } = useToast();

  const handleSelectInvoice = (invoiceId: number, checked: boolean) => {
    if (checked) {
      setSelectedInvoices(prev => [...prev, invoiceId]);
    } else {
      setSelectedInvoices(prev => prev.filter(id => id !== invoiceId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && invoices) {
      setSelectedInvoices(invoices.map(inv => inv.id));
    } else {
      setSelectedInvoices([]);
    }
  };

  const handleApproveInvoice = async (invoiceId: number) => {
    try {
      await updateInvoiceStatus.mutateAsync({
        id: invoiceId,
        status: "approved",
        userId: 1, // TODO: Get from auth context
      });
      
      toast({
        title: "Invoice Approved",
        description: "Invoice has been approved successfully",
      });
    } catch (error) {
      toast({
        title: "Approval Failed",
        description: "Failed to approve invoice",
        variant: "destructive",
      });
    }
  };

  const handleRejectInvoice = async (invoiceId: number) => {
    try {
      await updateInvoiceStatus.mutateAsync({
        id: invoiceId,
        status: "pending_entry",
        userId: 1, // TODO: Get from auth context
      });
      
      toast({
        title: "Invoice Rejected",
        description: "Invoice has been sent back for revision",
      });
    } catch (error) {
      toast({
        title: "Rejection Failed",
        description: "Failed to reject invoice",
        variant: "destructive",
      });
    }
  };

  const handleBulkApprove = async () => {
    try {
      for (const invoiceId of selectedInvoices) {
        await updateInvoiceStatus.mutateAsync({
          id: invoiceId,
          status: "approved",
          userId: 1, // TODO: Get from auth context
        });
      }
      
      setSelectedInvoices([]);
      toast({
        title: "Bulk Approval Complete",
        description: `${selectedInvoices.length} invoices approved`,
      });
    } catch (error) {
      toast({
        title: "Bulk Approval Failed",
        description: "Failed to approve all selected invoices",
        variant: "destructive",
      });
    }
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
        <h1 className="text-3xl font-bold gradient-text">Review Queue</h1>
        <p className="text-muted-foreground mt-2">Review and approve invoices ready for processing</p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="modern-card hover-lift border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Eye className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{invoices?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card hover-lift border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <CheckCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{selectedInvoices.length}</p>
                <p className="text-sm text-muted-foreground">Selected</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card hover-lift border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  ${invoices?.reduce((sum, inv) => sum + parseFloat(inv.invoiceAmount), 0).toFixed(2) || "0.00"}
                </p>
                <p className="text-sm text-muted-foreground">Total Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="modern-card border-0">
        <CardHeader className="border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <Eye className="h-5 w-5 text-purple-600" />
              Invoices Pending Review
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="hover-lift">
                <Filter className="h-4 w-4 mr-1" />
                Filter
              </Button>
              {selectedInvoices.length > 0 && (
                <Button 
                  size="sm" 
                  onClick={handleBulkApprove}
                  disabled={updateInvoiceStatus.isPending}
                  className="btn-modern bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCheck className="h-4 w-4 mr-1" />
                  Bulk Approve ({selectedInvoices.length})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3">
                    <Checkbox
                      checked={invoices?.length > 0 && selectedInvoices.length === invoices.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="pb-3 font-medium">Invoice #</th>
                  <th className="pb-3 font-medium">Vendor</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">VIN</th>
                  <th className="pb-3 font-medium">GL Code</th>
                  <th className="pb-3 font-medium">Entered By</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices?.map((invoice) => (
                  <tr key={invoice.id} className="border-b">
                    <td className="py-3">
                      <Checkbox
                        checked={selectedInvoices.includes(invoice.id)}
                        onCheckedChange={(checked) => 
                          handleSelectInvoice(invoice.id, checked as boolean)
                        }
                      />
                    </td>
                    <td className="py-3">{invoice.invoiceNumber}</td>
                    <td className="py-3">{invoice.vendorName}</td>
                    <td className="py-3">${invoice.invoiceAmount}</td>
                    <td className="py-3">{invoice.vin}</td>
                    <td className="py-3">
                      {invoice.glCode ? (
                        <Badge variant="default">{invoice.glCode}</Badge>
                      ) : (
                        <Badge variant="secondary">Unassigned</Badge>
                      )}
                    </td>
                    <td className="py-3">User #{invoice.enteredBy || invoice.uploadedBy}</td>
                    <td className="py-3">
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setReviewModalInvoice(invoice)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApproveInvoice(invoice.id)}
                          disabled={updateInvoiceStatus.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRejectInvoice(invoice.id)}
                          disabled={updateInvoiceStatus.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {(!invoices || invoices.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                No invoices pending review
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <ReviewModal
        isOpen={!!reviewModalInvoice}
        onClose={() => setReviewModalInvoice(null)}
        invoice={reviewModalInvoice}
        onApprove={handleApproveInvoice}
        onReject={handleRejectInvoice}
      />
    </div>
  );
}

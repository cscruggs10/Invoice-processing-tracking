import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, Download, FileText, CheckCircle, Calendar, DollarSign } from "lucide-react";
import { useInvoices } from "@/hooks/use-invoices";
import { ReviewModal } from "@/components/modals/review-modal";
import type { Invoice } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function Approved() {
  const [selectedInvoices, setSelectedInvoices] = useState<number[]>([]);
  const [reviewModalInvoice, setReviewModalInvoice] = useState<Invoice | null>(null);
  
  const { data: invoices, isLoading } = useInvoices({ 
    status: ["approved"] 
  });
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

  const handleExportSelected = async () => {
    if (selectedInvoices.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select invoices to export",
        variant: "destructive",
      });
      return;
    }

    try {
      // TODO: Implement batch export functionality
      toast({
        title: "Export Started",
        description: `Exporting ${selectedInvoices.length} approved invoices`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export selected invoices",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Approved Invoices</h1>
            <p className="text-muted-foreground mt-2">View and export approved invoices</p>
          </div>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="modern-card animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Approved Invoices</h1>
          <p className="text-muted-foreground mt-2">
            View and export approved invoices ready for processing
          </p>
        </div>
        
        {selectedInvoices.length > 0 && (
          <div className="flex gap-2">
            <Button 
              onClick={handleExportSelected}
              className="btn-modern gradient-primary text-white"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Selected ({selectedInvoices.length})
            </Button>
          </div>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="modern-card hover-lift border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{invoices?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Approved Invoices</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card hover-lift border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  ${invoices?.reduce((sum, inv) => sum + parseFloat(inv.invoiceAmount), 0).toFixed(2) || "0.00"}
                </p>
                <p className="text-sm text-muted-foreground">Total Value</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card hover-lift border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{selectedInvoices.length}</p>
                <p className="text-sm text-muted-foreground">Selected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices List */}
      <Card className="modern-card border-0">
        <CardHeader className="border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Approved Invoices
            </CardTitle>
            {invoices && invoices.length > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedInvoices.length === invoices.length}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-muted-foreground">Select All</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!invoices || invoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No approved invoices</p>
              <p className="text-sm">Invoices will appear here once they are approved</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {invoices.map((invoice, index) => (
                <div 
                  key={invoice.id} 
                  className="p-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors animate-fadeIn"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={selectedInvoices.includes(invoice.id)}
                      onCheckedChange={(checked) => handleSelectInvoice(invoice.id, checked as boolean)}
                    />
                    
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <p className="font-medium">{invoice.invoiceNumber}</p>
                        <p className="text-sm text-muted-foreground">{invoice.vendorName}</p>
                      </div>
                      
                      <div>
                        <p className="font-semibold text-green-600">${invoice.invoiceAmount}</p>
                        <p className="text-sm text-muted-foreground">VIN: {invoice.vin}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm">
                          Due: {new Date(invoice.dueDate).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Approved: {invoice.updatedAt ? new Date(invoice.updatedAt).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          Approved
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setReviewModalInvoice(invoice)}
                          className="hover-lift"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Modal */}
      {reviewModalInvoice && (
        <ReviewModal
          invoice={reviewModalInvoice}
          onClose={() => setReviewModalInvoice(null)}
          onApprove={() => {}} // Disabled since already approved
          onReject={() => {}} // Disabled since already approved
          readOnly={true}
        />
      )}
    </div>
  );
}
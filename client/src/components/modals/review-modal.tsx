import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { InvoicePreview } from "@/components/invoice-preview";
import type { Invoice } from "@shared/schema";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onApprove: (invoiceId: number) => void;
  onReject: (invoiceId: number) => void;
}

export function ReviewModal({ isOpen, onClose, invoice, onApprove, onReject }: ReviewModalProps) {
  if (!invoice) return null;

  const handleApprove = () => {
    onApprove(invoice.id);
    onClose();
  };

  const handleReject = () => {
    onReject(invoice.id);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full">
        <DialogHeader className="pb-4">
          <DialogTitle>Invoice Review - {invoice.invoiceNumber}</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full overflow-hidden">
          {/* Full PDF Viewer */}
          <div className="h-full">
            <InvoicePreview invoice={invoice} />
          </div>
          
          {/* Invoice Details Panel */}
          <div className="space-y-4 overflow-y-auto">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3">Invoice Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="font-medium">Vendor:</span>
                  <span>{invoice.vendorName}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-medium">Invoice #:</span>
                  <span>{invoice.invoiceNumber}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-medium">Amount:</span>
                  <span>${invoice.invoiceAmount}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-medium">VIN:</span>
                  <span>{invoice.vin}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-medium">GL Code:</span>
                  <span>
                    {invoice.glCode ? (
                      <Badge variant="default">{invoice.glCode}</Badge>
                    ) : (
                      <Badge variant="secondary">Not assigned</Badge>
                    )}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-medium">Type:</span>
                  <span>{invoice.invoiceType}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-medium">Status:</span>
                  <span>
                    <Badge variant="outline">{invoice.status.replace('_', ' ')}</Badge>
                  </span>
                </div>
                
                {invoice.description && (
                  <div>
                    <span className="font-medium block mb-1">Description:</span>
                    <p className="text-sm text-gray-600">{invoice.description}</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Review Actions */}
            <div className="bg-white border border-gray-200 p-4 rounded-lg">
              <h3 className="font-semibold mb-3">Review Actions</h3>
              <div className="flex flex-col gap-2">
                <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700 w-full">
                  <Check className="h-4 w-4 mr-2" />
                  Approve Invoice
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleReject}
                  className="w-full"
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject Invoice
                </Button>
                <Button variant="outline" onClick={onClose} className="w-full">
                  Close Review
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

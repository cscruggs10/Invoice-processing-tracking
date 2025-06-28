import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
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
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Invoice Review - {invoice.invoiceNumber}</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-3">Invoice Preview</h3>
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="aspect-video bg-white rounded border-2 border-dashed border-gray-300 flex items-center justify-center">
                <p className="text-gray-500">Invoice document preview would appear here</p>
              </div>
            </div>
          </div>
          
          <div>
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
        </div>
        
        <DialogFooter className="flex justify-between">
          <Button 
            variant="destructive" 
            onClick={handleReject}
            className="mr-auto"
          >
            <X className="h-4 w-4 mr-2" />
            Reject
          </Button>
          
          <div className="space-x-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
              <Check className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

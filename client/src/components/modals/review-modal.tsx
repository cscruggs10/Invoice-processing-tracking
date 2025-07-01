import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, X, Edit, AlertTriangle } from "lucide-react";
import { InvoicePreview } from "@/components/invoice-preview";
import { useUpdateInvoice, useUpdateInvoiceStatus } from "@/hooks/use-invoices";
import { useToast } from "@/hooks/use-toast";
import type { Invoice } from "@shared/schema";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onApprove: (invoiceId: number) => void;
  onReject: (invoiceId: number) => void;
}

export function ReviewModal({ isOpen, onClose, invoice, onApprove, onReject }: ReviewModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showAdminReasonDialog, setShowAdminReasonDialog] = useState(false);
  const [adminReason, setAdminReason] = useState("");
  const [editData, setEditData] = useState({
    vendorName: "",
    vendorNumber: "",
    invoiceNumber: "",
    invoiceAmount: "",
    vin: "",
    invoiceType: "",
    description: "",
  });

  const updateInvoice = useUpdateInvoice();
  const updateInvoiceStatus = useUpdateInvoiceStatus();
  const { toast } = useToast();

  // Initialize edit data when invoice changes
  useEffect(() => {
    if (invoice) {
      setEditData({
        vendorName: invoice.vendorName,
        vendorNumber: invoice.vendorNumber,
        invoiceNumber: invoice.invoiceNumber,
        invoiceAmount: invoice.invoiceAmount,
        vin: invoice.vin,
        invoiceType: invoice.invoiceType,
        description: invoice.description || "",
      });
    }
  }, [invoice]);

  if (!invoice) return null;

  const handleApprove = () => {
    onApprove(invoice.id);
    onClose();
  };

  const handleReject = () => {
    onReject(invoice.id);
    onClose();
  };

  const handleSaveEdit = async () => {
    try {
      await updateInvoice.mutateAsync({
        id: invoice.id,
        updates: {
          vendorName: editData.vendorName,
          vendorNumber: editData.vendorNumber,
          invoiceNumber: editData.invoiceNumber,
          invoiceAmount: editData.invoiceAmount,
          vin: editData.vin,
          invoiceType: editData.invoiceType,
          description: editData.description,
        }
      });
      
      toast({
        title: "Invoice Updated",
        description: "Invoice details have been saved successfully",
      });
      
      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update invoice",
        variant: "destructive",
      });
    }
  };

  const handleSendToAdminReview = async () => {
    if (!adminReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for sending to admin review",
        variant: "destructive",
      });
      return;
    }

    try {
      // Update invoice with reason and send to admin review
      await updateInvoice.mutateAsync({
        id: invoice.id,
        updates: {
          description: `${invoice.description || ""}\n\nReview Reason: ${adminReason}`.trim()
        }
      });

      await updateInvoiceStatus.mutateAsync({
        id: invoice.id,
        status: "admin_review",
        userId: 1, // TODO: Get from auth context
      });
      
      toast({
        title: "Sent to Admin Review",
        description: "Invoice has been forwarded to admin review with your reason",
      });
      
      setShowAdminReasonDialog(false);
      setAdminReason("");
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send to admin review",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center justify-between">
              Invoice Review - {invoice.invoiceNumber}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit className="h-4 w-4 mr-2" />
                {isEditing ? "Cancel Edit" : "Edit Invoice"}
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full overflow-hidden">
            {/* Full PDF Viewer */}
            <div className="h-full">
              <InvoicePreview invoice={invoice} />
            </div>
            
            {/* Invoice Details Panel */}
            <div className="space-y-4 overflow-y-auto">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">
                  {isEditing ? "Edit Invoice Details" : "Invoice Details"}
                </h3>
                
                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="vendorName">Vendor Name</Label>
                      <Input
                        id="vendorName"
                        value={editData.vendorName}
                        onChange={(e) => setEditData(prev => ({ ...prev, vendorName: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="vendorNumber">Vendor Number</Label>
                      <Input
                        id="vendorNumber"
                        value={editData.vendorNumber}
                        onChange={(e) => setEditData(prev => ({ ...prev, vendorNumber: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="invoiceNumber">Invoice Number</Label>
                      <Input
                        id="invoiceNumber"
                        value={editData.invoiceNumber}
                        onChange={(e) => setEditData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="invoiceAmount">Invoice Amount</Label>
                      <Input
                        id="invoiceAmount"
                        value={editData.invoiceAmount}
                        onChange={(e) => setEditData(prev => ({ ...prev, invoiceAmount: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="vin">VIN</Label>
                      <Input
                        id="vin"
                        value={editData.vin}
                        onChange={(e) => setEditData(prev => ({ ...prev, vin: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="invoiceType">Invoice Type</Label>
                      <Select
                        value={editData.invoiceType}
                        onValueChange={(value) => setEditData(prev => ({ ...prev, invoiceType: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Parts">Parts</SelectItem>
                          <SelectItem value="Labor">Labor</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={editData.description}
                        onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                      />
                    </div>
                    
                    <Button 
                      onClick={handleSaveEdit} 
                      disabled={updateInvoice.isPending}
                      className="w-full"
                    >
                      Save Changes
                    </Button>
                  </div>
                ) : (
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
                )}
              </div>
              
              {/* Review Actions */}
              {!isEditing && (
                <div className="bg-white border border-gray-200 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3">Review Actions</h3>
                  <div className="flex flex-col gap-2">
                    <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700 w-full">
                      <Check className="h-4 w-4 mr-2" />
                      Approve Invoice
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setShowAdminReasonDialog(true)}
                      className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Send to Admin Review
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
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin Review Reason Dialog */}
      <Dialog open={showAdminReasonDialog} onOpenChange={setShowAdminReasonDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send to Admin Review</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Please provide a reason for sending this invoice to admin review. 
                This helps the admin understand what needs attention.
              </AlertDescription>
            </Alert>
            
            <div>
              <Label htmlFor="adminReason">Reason for Admin Review</Label>
              <Textarea
                id="adminReason"
                value={adminReason}
                onChange={(e) => setAdminReason(e.target.value)}
                placeholder="e.g., Unable to verify VIN, unclear invoice amount, vendor not found..."
                rows={4}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowAdminReasonDialog(false);
                setAdminReason("");
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSendToAdminReview}
              disabled={updateInvoiceStatus.isPending || !adminReason.trim()}
            >
              Send to Admin Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

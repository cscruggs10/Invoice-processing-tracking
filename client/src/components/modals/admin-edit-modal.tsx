import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, X, Info } from "lucide-react";
import { useUpdateInvoice, useUpdateInvoiceStatus } from "@/hooks/use-invoices";
import type { Invoice } from "@/lib/types";

const adminEditSchema = z.object({
  vendorName: z.string().min(1, "Vendor name is required"),
  vendorNumber: z.string().min(1, "Vendor number is required"),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  invoiceAmount: z.number().min(0.01, "Invoice amount must be greater than 0"),
  vin: z.string().length(8, "VIN must be exactly 8 digits"),
  invoiceType: z.string().min(1, "Invoice type is required"),
  description: z.string().optional(),
  dueDate: z.string().min(1, "Due date is required"),
  glCode: z.string().min(1, "GL Code is required for approval"),
});

type AdminEditFormData = z.infer<typeof adminEditSchema>;

interface AdminEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
}

export function AdminEditModal({ isOpen, onClose, invoice }: AdminEditModalProps) {
  const updateInvoice = useUpdateInvoice();
  const updateStatus = useUpdateInvoiceStatus();

  const form = useForm<AdminEditFormData>({
    resolver: zodResolver(adminEditSchema),
    defaultValues: {
      vendorName: "",
      vendorNumber: "",
      invoiceNumber: "",
      invoiceDate: "",
      invoiceAmount: 0,
      vin: "",
      invoiceType: "",
      description: "",
      dueDate: "",
      glCode: "",
    },
  });

  const { handleSubmit, formState: { errors, isSubmitting }, reset } = form;

  // Reset form when invoice changes
  useEffect(() => {
    if (invoice) {
      reset({
        vendorName: invoice.vendorName,
        vendorNumber: invoice.vendorNumber,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: new Date(invoice.invoiceDate).toISOString().split('T')[0],
        invoiceAmount: parseFloat(invoice.invoiceAmount),
        vin: invoice.vin,
        invoiceType: invoice.invoiceType,
        description: invoice.description || "",
        dueDate: new Date(invoice.dueDate).toISOString().split('T')[0],
        glCode: invoice.glCode || "",
      });
    }
  }, [invoice, reset]);

  const onSubmit = async (data: AdminEditFormData) => {
    if (!invoice) return;

    try {
      // Update invoice data
      await updateInvoice.mutateAsync({
        id: invoice.id,
        updates: {
          vendorName: data.vendorName,
          vendorNumber: data.vendorNumber,
          invoiceNumber: data.invoiceNumber,
          invoiceDate: new Date(data.invoiceDate),
          invoiceAmount: data.invoiceAmount.toString(),
          vin: data.vin,
          invoiceType: data.invoiceType,
          description: data.description || null,
          dueDate: new Date(data.dueDate),
          glCode: data.glCode,
        }
      });

      // Update status to approved
      await updateStatus.mutateAsync({
        id: invoice.id,
        status: "approved",
        userId: 1, // TODO: Get from auth context
      });

      onClose();
    } catch (error) {
      console.error("Failed to update invoice:", error);
    }
  };

  const getVinStatusMessage = () => {
    if (!invoice?.vinLookupResult) return null;

    const { found, database, daysSinceUpdate } = invoice.vinLookupResult;
    
    if (!found) {
      return {
        type: "error",
        message: "VIN not found in any database. Manual GL code assignment required."
      };
    }

    if (database === "sold") {
      return {
        type: "warning",
        message: `VIN found in sold inventory (${daysSinceUpdate} days ago). Verify GL code assignment.`
      };
    }

    if (database === "current_account") {
      return {
        type: "warning",
        message: `VIN found in current account database. Review GL code assignment.`
      };
    }

    return null;
  };

  const vinStatusMessage = getVinStatusMessage();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Admin Review & Edit - {invoice?.invoiceNumber}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* VIN Status Alert */}
          {vinStatusMessage && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>VIN Lookup Status:</strong> {vinStatusMessage.message}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vendorName">Vendor Name *</Label>
              <Input
                id="vendorName"
                {...form.register("vendorName")}
                placeholder="Enter vendor name"
              />
              {errors.vendorName && (
                <p className="text-sm text-red-600">{errors.vendorName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendorNumber">Vendor # *</Label>
              <Input
                id="vendorNumber"
                {...form.register("vendorNumber")}
                placeholder="Vendor number"
              />
              {errors.vendorNumber && (
                <p className="text-sm text-red-600">{errors.vendorNumber.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">Invoice # *</Label>
              <Input
                id="invoiceNumber"
                {...form.register("invoiceNumber")}
                placeholder="Invoice number"
              />
              {errors.invoiceNumber && (
                <p className="text-sm text-red-600">{errors.invoiceNumber.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoiceDate">Invoice Date *</Label>
              <Input
                id="invoiceDate"
                type="date"
                {...form.register("invoiceDate")}
              />
              {errors.invoiceDate && (
                <p className="text-sm text-red-600">{errors.invoiceDate.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoiceAmount">Invoice Amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <Input
                  id="invoiceAmount"
                  type="number"
                  step="0.01"
                  className="pl-8"
                  {...form.register("invoiceAmount", { valueAsNumber: true })}
                  placeholder="0.00"
                />
              </div>
              {errors.invoiceAmount && (
                <p className="text-sm text-red-600">{errors.invoiceAmount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="vin">VIN (Last 8 digits) *</Label>
              <Input
                id="vin"
                maxLength={8}
                {...form.register("vin")}
                placeholder="Last 8 digits"
              />
              {errors.vin && (
                <p className="text-sm text-red-600">{errors.vin.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoiceType">Invoice Type *</Label>
              <Select onValueChange={(value) => form.setValue("invoiceType", value)} defaultValue={form.getValues("invoiceType")}>
                <SelectTrigger className={errors.invoiceType ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select invoice type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Charge">Charge</SelectItem>
                  <SelectItem value="Credit Memo">Credit Memo</SelectItem>
                </SelectContent>
              </Select>
              {errors.invoiceType && (
                <p className="text-sm text-red-600">{errors.invoiceType.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date *</Label>
              <Input
                id="dueDate"
                type="date"
                {...form.register("dueDate")}
              />
              {errors.dueDate && (
                <p className="text-sm text-red-600">{errors.dueDate.message}</p>
              )}
            </div>
          </div>

          {/* GL Code Assignment */}
          <div className="space-y-2">
            <Label htmlFor="glCode">GL Code * (Admin Assignment Required)</Label>
            <Select
              value={form.watch("glCode")}
              onValueChange={(value) => form.setValue("glCode", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select GL Code" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1400">1400 - Inventory Items</SelectItem>
                <SelectItem value="2100">2100 - Parts & Supplies</SelectItem>
                <SelectItem value="2200">2200 - Service Labor</SelectItem>
                <SelectItem value="2300">2300 - Miscellaneous</SelectItem>
                <SelectItem value="2400">2400 - Warranty Repairs</SelectItem>
              </SelectContent>
            </Select>
            {errors.glCode && (
              <p className="text-sm text-red-600">{errors.glCode.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              {...form.register("description")}
              placeholder="Additional notes or description"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button 
              type="submit" 
              disabled={isSubmitting || updateInvoice.isPending || updateStatus.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="h-4 w-4 mr-2" />
              Save & Submit for Approval
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
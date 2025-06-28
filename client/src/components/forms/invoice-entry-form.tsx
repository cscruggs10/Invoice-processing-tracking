import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Save, X } from "lucide-react";
import { useVinLookup } from "@/hooks/use-vin-lookup";
import { useCreateInvoice } from "@/hooks/use-invoices";
import type { InvoiceFormData } from "@/lib/types";

const invoiceSchema = z.object({
  vendorName: z.string().min(1, "Vendor name is required"),
  vendorNumber: z.string().min(1, "Vendor number is required"),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  invoiceAmount: z.number().min(0.01, "Invoice amount must be greater than 0"),
  vin: z.string().length(8, "VIN must be exactly 8 digits"),
  invoiceType: z.string().min(1, "Invoice type is required"),
  description: z.string().optional(),
  dueDate: z.string().min(1, "Due date is required"),
});

interface InvoiceEntryFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function InvoiceEntryForm({ onSuccess, onCancel }: InvoiceEntryFormProps) {
  const [watchedVin, setWatchedVin] = useState("");
  const createInvoice = useCreateInvoice();
  const vinLookup = useVinLookup(watchedVin);

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      vendorName: "",
      vendorNumber: "",
      invoiceNumber: "",
      invoiceDate: "",
      invoiceAmount: 0,
      vin: "",
      invoiceType: "",
      description: "",
      dueDate: new Date().toISOString().split('T')[0], // Auto-fill with today
    },
  });

  const { watch, handleSubmit, formState: { errors, isSubmitting } } = form;
  const vinValue = watch("vin");

  // Update VIN lookup when VIN changes
  React.useEffect(() => {
    if (vinValue && vinValue.length === 8) {
      setWatchedVin(vinValue);
    }
  }, [vinValue]);

  const onSubmit = async (data: InvoiceFormData) => {
    try {
      await createInvoice.mutateAsync({
        vendorName: data.vendorName,
        vendorNumber: data.vendorNumber,
        invoiceNumber: data.invoiceNumber,
        invoiceDate: new Date(data.invoiceDate),
        invoiceAmount: data.invoiceAmount.toString(),
        dueDate: new Date(data.dueDate),
        vin: data.vin,
        invoiceType: data.invoiceType,
        description: data.description || null,
        uploadedBy: 1, // TODO: Get from auth context
        status: "pending_entry",
        glCode: null,
        enteredBy: null,
        approvedBy: null,
        finalizedBy: null,
        vinLookupResult: null,
      });
      
      onSuccess?.();
    } catch (error) {
      console.error("Failed to create invoice:", error);
    }
  };

  const getVinLookupMessage = () => {
    if (!vinLookup.data || !vinLookup.data.found) {
      return { type: "warning", message: "VIN not found in any database. Will be routed to Admin Review." };
    }

    const { database, daysSinceUpdate } = vinLookup.data;
    
    if (database === "wholesale_inventory" || database === "retail_inventory") {
      return { 
        type: "success", 
        message: `Found in ${database.replace('_', ' ')}. GL Code: 1400 assigned automatically.` 
      };
    }
    
    return { 
      type: "warning", 
      message: `Found in ${database} database. ${daysSinceUpdate} days since last update. Will be routed to Admin Review.` 
    };
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
          <Input
            id="invoiceType"
            {...form.register("invoiceType")}
            placeholder="Parts, Service, etc."
          />
          {errors.invoiceType && (
            <p className="text-sm text-red-600">{errors.invoiceType.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="dueDate">Due Date</Label>
          <Input
            id="dueDate"
            type="date"
            {...form.register("dueDate")}
            readOnly
          />
          <p className="text-xs text-gray-600">Auto-filled with today's date</p>
        </div>
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

      {/* VIN Lookup Results */}
      {vinValue.length === 8 && vinLookup.data && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>VIN Lookup Result:</strong> {getVinLookupMessage().message}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2 pt-4">
        <Button 
          type="submit" 
          disabled={isSubmitting || createInvoice.isPending}
          className="bg-green-600 hover:bg-green-700"
        >
          <Save className="h-4 w-4 mr-2" />
          Save & Submit for Review
        </Button>
        {onCancel && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
          >
            <X className="h-4 w-4 mr-2" />
            Skip This Invoice
          </Button>
        )}
      </div>
    </form>
  );
}

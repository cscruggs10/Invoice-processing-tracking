import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, X, Search, AlertCircle } from "lucide-react";
import { useCreateInvoice, useUpdateInvoice } from "@/hooks/use-invoices";

import { useToast } from "@/hooks/use-toast";
import { insertInvoiceSchema } from "@shared/schema";
import { VendorSelect } from "@/components/vendor-select";

const invoiceFormSchema = insertInvoiceSchema.extend({
  invoiceDate: z.string().min(1, "Invoice date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  invoiceAmount: z.number().min(0.01, "Invoice amount must be greater than 0"),
});

type InvoiceFormData = z.infer<typeof invoiceFormSchema>;

interface SimpleInvoiceFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  existingInvoice?: { id: number; } | null;
}

export function SimpleInvoiceForm({ onSuccess, onCancel, existingInvoice }: SimpleInvoiceFormProps) {
  console.log("SimpleInvoiceForm component rendered", { existingInvoice });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      vendorName: "",
      vendorNumber: "",
      invoiceNumber: "",
      invoiceDate: "",
      invoiceAmount: "" as any,
      vin: "",
      invoiceType: "",
      description: "",
      dueDate: "",
    },
  });

  const onSubmit = async (data: InvoiceFormData) => {
    console.log("Form submitted with data:", data);
    console.log("Form errors:", form.formState.errors);
    setIsSubmitting(true);
    try {
      // Convert string dates to Date objects
      const invoiceData = {
        ...data,
        invoiceDate: new Date(data.invoiceDate),
        dueDate: new Date(data.dueDate),
        invoiceAmount: data.invoiceAmount.toString(),
        uploadedBy: 1, // TODO: Get from auth context
        status: "pending_review" as const,
        // VIN lookup will be performed during export process
        vinLookupResult: null,
        glCode: null,
      };

      await createInvoice.mutateAsync(invoiceData);
      
      toast({
        title: "Invoice Submitted",
        description: "Invoice has been submitted for review",
      });
      
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit invoice. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmitToAdminReview = async (data: InvoiceFormData) => {
    setIsSubmitting(true);
    try {
      const invoiceData = {
        ...data,
        invoiceDate: new Date(data.invoiceDate),
        dueDate: new Date(data.dueDate),
        invoiceAmount: data.invoiceAmount.toString(),
        uploadedBy: 1,
        status: "admin_review" as const,
        vinLookupResult: null,
        glCode: null,
      };

      await createInvoice.mutateAsync(invoiceData);
      
      toast({
        title: "Sent to Admin Review",
        description: "Invoice has been sent for admin review",
      });
      
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit invoice. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 md:col-span-2">
          <Label>Vendor *</Label>
          <VendorSelect
            value={form.watch("vendorNumber")}
            onSelect={(vendorNumber, vendorName) => {
              form.setValue("vendorNumber", vendorNumber);
              form.setValue("vendorName", vendorName);
            }}
            placeholder="Search and select vendor..."
            disabled={isSubmitting}
          />
          {(form.formState.errors.vendorName || form.formState.errors.vendorNumber) && (
            <p className="text-sm text-red-500">
              {form.formState.errors.vendorName?.message || form.formState.errors.vendorNumber?.message}
            </p>
          )}
        </div>

        {/* Hidden fields for vendor data - populated by VendorSelect */}
        <input type="hidden" {...form.register("vendorNumber")} />
        <input type="hidden" {...form.register("vendorName")} />

        <div className="space-y-2">
          <Label htmlFor="invoiceNumber">Invoice Number *</Label>
          <Input
            id="invoiceNumber"
            {...form.register("invoiceNumber")}
            className={form.formState.errors.invoiceNumber ? "border-red-500" : ""}
          />
          {form.formState.errors.invoiceNumber && (
            <p className="text-sm text-red-500">{form.formState.errors.invoiceNumber.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="invoiceDate">Invoice Date *</Label>
          <Input
            id="invoiceDate"
            type="date"
            {...form.register("invoiceDate")}
            className={form.formState.errors.invoiceDate ? "border-red-500" : ""}
          />
          {form.formState.errors.invoiceDate && (
            <p className="text-sm text-red-500">{form.formState.errors.invoiceDate.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="invoiceAmount">Invoice Amount *</Label>
          <Input
            id="invoiceAmount"
            type="number"
            step="0.01"
            {...form.register("invoiceAmount", { valueAsNumber: true })}
            className={form.formState.errors.invoiceAmount ? "border-red-500" : ""}
          />
          {form.formState.errors.invoiceAmount && (
            <p className="text-sm text-red-500">{form.formState.errors.invoiceAmount.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="dueDate">Due Date *</Label>
          <Input
            id="dueDate"
            type="date"
            {...form.register("dueDate")}
            className={form.formState.errors.dueDate ? "border-red-500" : ""}
          />
          {form.formState.errors.dueDate && (
            <p className="text-sm text-red-500">{form.formState.errors.dueDate.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="vin">VIN *</Label>
          <Input
            id="vin"
            {...form.register("vin")}
            className={form.formState.errors.vin ? "border-red-500" : ""}
            placeholder="Enter VIN (GL code will be assigned during export)"
          />
          {form.formState.errors.vin && (
            <p className="text-sm text-red-500">{form.formState.errors.vin.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="invoiceType">Invoice Type *</Label>
          <Select onValueChange={(value) => form.setValue("invoiceType", value)}>
            <SelectTrigger className={form.formState.errors.invoiceType ? "border-red-500" : ""}>
              <SelectValue placeholder="Select invoice type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Charge">Charge</SelectItem>
              <SelectItem value="Credit Memo">Credit Memo</SelectItem>
            </SelectContent>
          </Select>
          {form.formState.errors.invoiceType && (
            <p className="text-sm text-red-500">{form.formState.errors.invoiceType.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...form.register("description")}
          rows={3}
          placeholder="Additional notes or description"
        />
      </div>

      {/* VIN lookup and GL code assignment will happen during export process */}

      <div className="flex gap-2 pt-4">
        <button 
          type="button"
          onClick={async () => {
            console.log("Submit button clicked!");
            
            // Get form data directly
            const formData = form.getValues();
            console.log("Form data:", formData);
            
            // Simple validation - check if required fields are filled
            const requiredFields = ['vendorName', 'vendorNumber', 'invoiceNumber', 'invoiceDate', 'invoiceAmount', 'vin', 'invoiceType', 'dueDate'];
            const missingFields = requiredFields.filter(field => !formData[field]);
            
            if (missingFields.length > 0) {
              console.log("Missing required fields:", missingFields);
              alert(`Please fill in these required fields: ${missingFields.join(', ')}`);
              return;
            }
            
            console.log("All required fields filled, submitting...");
            
            // Submit directly
            try {
              setIsSubmitting(true);
              
              const invoiceData = {
                ...formData,
                invoiceDate: new Date(formData.invoiceDate),
                dueDate: new Date(formData.dueDate),
                invoiceAmount: formData.invoiceAmount.toString(),
                uploadedBy: 1,
                status: "pending_review" as const,
                vinLookupResult: null,
                glCode: null,
              };
              
              console.log("Sending invoice data:", invoiceData);
              
              if (existingInvoice) {
                // Update existing invoice
                await updateInvoice.mutateAsync({
                  id: existingInvoice.id,
                  updates: invoiceData
                });
              } else {
                // Create new invoice
                await createInvoice.mutateAsync(invoiceData);
              }
              
              toast({
                title: "Invoice Submitted",
                description: "Invoice has been submitted for review",
              });
              
              onSuccess?.();
            } catch (error) {
              console.error("Submit error:", error);
              toast({
                title: "Error",
                description: "Failed to submit invoice. Please try again.",
                variant: "destructive",
              });
            } finally {
              setIsSubmitting(false);
            }
          }}
          disabled={isSubmitting || createInvoice.isPending || updateInvoice.isPending}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md disabled:opacity-50"
        >
          Save & Submit for Review
        </button>
        
        <button 
          type="button"
          onClick={() => {
            console.log("Admin review button clicked!");
            const formData = form.getValues();
            console.log("Form data:", formData);
            
            form.trigger().then((isValid) => {
              console.log("Form is valid:", isValid);
              if (isValid) {
                onSubmitToAdminReview(formData);
              } else {
                console.log("Form validation failed:", form.formState.errors);
              }
            });
          }}
          disabled={isSubmitting || createInvoice.isPending}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md disabled:opacity-50"
        >
          Send to Admin Review
        </button>
        
        {onCancel && (
          <button 
            type="button" 
            onClick={() => {
              console.log("Cancel button clicked!");
              onCancel();
            }}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Skip This Invoice
          </button>
        )}
      </div>
    </form>
  );
}
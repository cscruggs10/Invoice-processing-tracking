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
import { useCreateInvoice } from "@/hooks/use-invoices";

import { useToast } from "@/hooks/use-toast";
import { insertInvoiceSchema } from "@shared/schema";

const invoiceFormSchema = insertInvoiceSchema.extend({
  invoiceDate: z.string().min(1, "Invoice date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  invoiceAmount: z.number().min(0.01, "Invoice amount must be greater than 0"),
});

type InvoiceFormData = z.infer<typeof invoiceFormSchema>;

interface SimpleInvoiceFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function SimpleInvoiceForm({ onSuccess, onCancel }: SimpleInvoiceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const createInvoice = useCreateInvoice();

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
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
        <div className="space-y-2">
          <Label htmlFor="vendorName">Vendor Name *</Label>
          <Input
            id="vendorName"
            {...form.register("vendorName")}
            className={form.formState.errors.vendorName ? "border-red-500" : ""}
          />
          {form.formState.errors.vendorName && (
            <p className="text-sm text-red-500">{form.formState.errors.vendorName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="vendorNumber">Vendor Number *</Label>
          <Input
            id="vendorNumber"
            {...form.register("vendorNumber")}
            className={form.formState.errors.vendorNumber ? "border-red-500" : ""}
          />
          {form.formState.errors.vendorNumber && (
            <p className="text-sm text-red-500">{form.formState.errors.vendorNumber.message}</p>
          )}
        </div>

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
        <Button 
          type="submit"
          disabled={isSubmitting || createInvoice.isPending}
          className="bg-green-600 hover:bg-green-700"
          onClick={() => {
            console.log("Button clicked!");
            console.log("Form state:", form.formState);
            console.log("Form values:", form.getValues());
            console.log("Form errors:", form.formState.errors);
          }}
        >
          <Save className="h-4 w-4 mr-2" />
          Save & Submit for Review
        </Button>
        <Button 
          type="button"
          onClick={form.handleSubmit(onSubmitToAdminReview)}
          disabled={isSubmitting || createInvoice.isPending}
          className="bg-orange-600 hover:bg-orange-700"
        >
          <Save className="h-4 w-4 mr-2" />
          Send to Admin Review
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
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, DollarSign } from "lucide-react";
import { useVinLookup } from "@/hooks/use-vin-lookup";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

const billingLineSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
  unitPrice: z.coerce.number().min(0.01, "Unit price must be greater than 0"),
  vin: z.string().optional(),
});

type BillingLineFormData = z.infer<typeof billingLineSchema>;

export interface BillingLineItem {
  id?: number;
  lineNumber: number;
  description: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  vin?: string;
  glCode?: string;
  vinLookupResult?: any;
}

interface BillingLinesFormProps {
  lines: BillingLineItem[];
  onChange: (lines: BillingLineItem[]) => void;
  invoiceTotal: number;
}

export function BillingLinesForm({ lines, onChange, invoiceTotal }: BillingLinesFormProps) {
  const [editingLine, setEditingLine] = useState<number | null>(null);
  
  const form = useForm<BillingLineFormData>({
    resolver: zodResolver(billingLineSchema),
    defaultValues: {
      description: "",
      quantity: 1,
      unitPrice: 0,
      vin: "",
    },
  });

  const { watch } = form;
  const watchedVin = watch("vin");
  const watchedQuantity = watch("quantity");
  const watchedUnitPrice = watch("unitPrice");
  
  const { data: vinLookup } = useVinLookup(watchedVin || "");
  
  const calculatedTotal = (watchedQuantity || 0) * (watchedUnitPrice || 0);
  const linesTotal = lines.reduce((sum, line) => sum + line.totalAmount, 0);

  const handleAddLine = (data: BillingLineFormData) => {
    const newLine: BillingLineItem = {
      lineNumber: lines.length + 1,
      description: data.description,
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      totalAmount: data.quantity * data.unitPrice,
      vin: data.vin || undefined,
      vinLookupResult: vinLookup && data.vin ? vinLookup : undefined,
      glCode: vinLookup?.found ? "1400" : undefined, // Auto-assign GL code based on VIN lookup
    };
    
    onChange([...lines, newLine]);
    form.reset();
    setEditingLine(null);
  };

  const handleEditLine = (index: number) => {
    const line = lines[index];
    form.setValue("description", line.description);
    form.setValue("quantity", line.quantity);
    form.setValue("unitPrice", line.unitPrice);
    form.setValue("vin", line.vin || "");
    setEditingLine(index);
  };

  const handleUpdateLine = (data: BillingLineFormData) => {
    if (editingLine === null) return;
    
    const updatedLines = [...lines];
    updatedLines[editingLine] = {
      ...updatedLines[editingLine],
      description: data.description,
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      totalAmount: data.quantity * data.unitPrice,
      vin: data.vin || undefined,
      vinLookupResult: vinLookup && data.vin ? vinLookup : undefined,
      glCode: vinLookup?.found ? "1400" : undefined,
    };
    
    onChange(updatedLines);
    form.reset();
    setEditingLine(null);
  };

  const handleDeleteLine = (index: number) => {
    const updatedLines = lines.filter((_, i) => i !== index)
      .map((line, i) => ({ ...line, lineNumber: i + 1 }));
    onChange(updatedLines);
  };

  const handleCancel = () => {
    form.reset();
    setEditingLine(null);
  };

  return (
    <div className="space-y-4">
      {/* Add/Edit Line Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {editingLine !== null ? "Edit Line Item" : "Add Line Item"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form 
            onSubmit={form.handleSubmit(editingLine !== null ? handleUpdateLine : handleAddLine)}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Enter line item description..."
                  {...form.register("description")}
                />
                {form.formState.errors.description && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.description.message}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="vin">VIN (Optional)</Label>
                <Input
                  id="vin"
                  placeholder="Enter VIN for this line item..."
                  {...form.register("vin")}
                />
                {watchedVin && vinLookup && (
                  <div className="mt-2">
                    {vinLookup.found ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        Found in {vinLookup.database?.replace('_', ' ')} 
                        {vinLookup.daysSinceUpdate && ` (${vinLookup.daysSinceUpdate} days old)`}
                      </Badge>
                    ) : (
                      <Badge variant="destructive">VIN not found - will require admin review</Badge>
                    )}
                  </div>
                )}
              </div>
              
              <div>
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="1.00"
                  {...form.register("quantity")}
                />
                {form.formState.errors.quantity && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.quantity.message}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="unitPrice">Unit Price *</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  {...form.register("unitPrice")}
                />
                {form.formState.errors.unitPrice && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.unitPrice.message}
                  </p>
                )}
              </div>
            </div>
            
            {calculatedTotal > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <DollarSign className="h-4 w-4" />
                Line Total: ${calculatedTotal.toFixed(2)}
              </div>
            )}
            
            <div className="flex gap-2">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                {editingLine !== null ? "Update Line" : "Add Line"}
              </Button>
              {editingLine !== null && (
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Existing Lines */}
      {lines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Line Items ({lines.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lines.map((line, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="font-medium">
                      Line {line.lineNumber}: {line.description}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Qty: {line.quantity} × ${line.unitPrice.toFixed(2)} = ${line.totalAmount.toFixed(2)}
                      {line.vin && (
                        <>
                          <br />
                          VIN: {line.vin}
                          {line.vinLookupResult?.found && (
                            <Badge variant="default" className="ml-2 bg-green-100 text-green-800">
                              Found in {line.vinLookupResult.database?.replace('_', ' ')}
                            </Badge>
                          )}
                          {line.glCode && (
                            <Badge variant="outline" className="ml-2">
                              GL: {line.glCode}
                            </Badge>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditLine(index)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteLine(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total from Line Items:</span>
                <span className="text-lg font-bold">${linesTotal.toFixed(2)}</span>
              </div>
              
              {Math.abs(linesTotal - invoiceTotal) > 0.01 && (
                <Alert className="mt-3">
                  <AlertDescription>
                    <strong>Total Mismatch:</strong> Line items total (${linesTotal.toFixed(2)}) 
                    doesn't match invoice total (${invoiceTotal.toFixed(2)}). 
                    Difference: ${Math.abs(linesTotal - invoiceTotal).toFixed(2)}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
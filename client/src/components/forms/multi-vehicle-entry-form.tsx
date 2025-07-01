import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Save, CheckCircle, ZoomIn, Download } from "lucide-react";
import { SimpleInvoiceForm } from "./simple-invoice-form";
import { useToast } from "@/hooks/use-toast";

interface MultiVehicleEntryFormProps {
  vehicleCount: number;
  onCancel: () => void;
  onAllComplete: () => void;
}

export function MultiVehicleEntryForm({ vehicleCount, onCancel, onAllComplete }: MultiVehicleEntryFormProps) {
  const [completedForms, setCompletedForms] = useState<Set<number>>(new Set());
  const [currentForm, setCurrentForm] = useState(0);
  const { toast } = useToast();

  const handleFormSuccess = (formIndex: number) => {
    const newCompleted = new Set(completedForms);
    newCompleted.add(formIndex);
    setCompletedForms(newCompleted);

    toast({
      title: "Vehicle Invoice Submitted",
      description: `Vehicle ${formIndex + 1} of ${vehicleCount} completed`,
    });

    // Move to next incomplete form or finish
    if (newCompleted.size === vehicleCount) {
      onAllComplete();
    } else {
      // Find next incomplete form
      for (let i = 0; i < vehicleCount; i++) {
        if (!newCompleted.has(i)) {
          setCurrentForm(i);
          break;
        }
      }
    }
  };

  const vehicleForms = Array.from({ length: vehicleCount }, (_, index) => index);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Multiple Vehicle Data Entry</h2>
          <p className="text-gray-600">
            Complete data entry for {vehicleCount} vehicles ({completedForms.size}/{vehicleCount} completed)
          </p>
        </div>
        <Button variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
      </div>

      {/* Progress indicator */}
      <div className="flex gap-2 mb-6">
        {vehicleForms.map((index) => (
          <Button
            key={index}
            variant={completedForms.has(index) ? "default" : currentForm === index ? "secondary" : "outline"}
            size="sm"
            onClick={() => !completedForms.has(index) && setCurrentForm(index)}
            className="min-w-[100px]"
          >
            {completedForms.has(index) && <CheckCircle className="h-4 w-4 mr-1" />}
            Vehicle {index + 1}
          </Button>
        ))}
      </div>

      {/* Current form with invoice preview */}
      {!completedForms.has(currentForm) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Invoice Document Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ZoomIn className="h-5 w-5" />
                Invoice Document
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center">
                <div className="text-center">
                  <Download className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Invoice preview will appear here</p>
                  <Button variant="outline" className="mt-2">
                    Download PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vehicle Data Entry Form */}
          <Card>
            <CardHeader>
              <CardTitle>Vehicle {currentForm + 1} of {vehicleCount}</CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleInvoiceForm
                onSuccess={() => handleFormSuccess(currentForm)}
                onCancel={() => {
                  // Find next incomplete form or stay on current
                  const nextIncomplete = vehicleForms.find(i => i > currentForm && !completedForms.has(i));
                  if (nextIncomplete !== undefined) {
                    setCurrentForm(nextIncomplete);
                  }
                }}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* All forms completed */}
      {completedForms.size === vehicleCount && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-900 mb-2">
                All Vehicle Forms Completed!
              </h3>
              <p className="text-green-700 mb-4">
                {vehicleCount} vehicle invoices have been submitted for review.
              </p>
              <Button onClick={onAllComplete} className="bg-green-600 hover:bg-green-700">
                Continue to Next Invoice
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
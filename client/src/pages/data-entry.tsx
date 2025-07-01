import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InvoiceEntryForm } from "@/components/forms/invoice-entry-form";
import { VehicleSelectionForm } from "@/components/forms/vehicle-selection-form";
import { MultiVehicleEntryForm } from "@/components/forms/multi-vehicle-entry-form";
import { ZoomIn, Download, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type EntryStep = "selection" | "single" | "multiple";

export default function DataEntry() {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<EntryStep>("selection");
  const [vehicleCount, setVehicleCount] = useState(1);

  const handleVehicleSelection = (count: number) => {
    setVehicleCount(count);
    setCurrentStep(count === 1 ? "single" : "multiple");
  };

  const handleFormSuccess = () => {
    toast({
      title: "Invoice Submitted",
      description: "Invoice has been submitted for review",
    });
    // Reset to selection for next invoice
    setCurrentStep("selection");
  };

  const handleSkipInvoice = () => {
    toast({
      title: "Invoice Skipped",
      description: "Moving to next invoice in queue",
    });
    setCurrentStep("selection");
  };

  const handleBackToSelection = () => {
    setCurrentStep("selection");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        {currentStep !== "selection" && (
          <Button variant="outline" onClick={handleBackToSelection}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}
        <div>
          <h1 className="text-2xl font-bold">Data Entry Queue</h1>
          <p className="text-gray-600">
            {currentStep === "selection" && "Select vehicle type for this invoice"}
            {currentStep === "single" && "Enter invoice data for single vehicle"}
            {currentStep === "multiple" && `Enter invoice data for ${vehicleCount} vehicles`}
          </p>
        </div>
      </div>

      {currentStep === "selection" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Document Preview */}
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

          {/* Vehicle Selection Form */}
          <div>
            <VehicleSelectionForm onSelection={handleVehicleSelection} />
          </div>
        </div>
      )}

      {currentStep === "single" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Document Preview */}
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

          {/* Single Vehicle Data Entry Form */}
          <Card>
            <CardHeader>
              <CardTitle>Single Vehicle Invoice</CardTitle>
            </CardHeader>
            <CardContent>
              <InvoiceEntryForm
                onSuccess={handleFormSuccess}
                onCancel={handleSkipInvoice}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {currentStep === "multiple" && (
        <MultiVehicleEntryForm
          vehicleCount={vehicleCount}
          onCancel={handleBackToSelection}
          onAllComplete={handleFormSuccess}
        />
      )}
    </div>
  );
}

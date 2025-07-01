import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SimpleInvoiceForm } from "@/components/forms/simple-invoice-form";
import { VehicleSelectionForm } from "@/components/forms/vehicle-selection-form";
import { MultiVehicleEntryForm } from "@/components/forms/multi-vehicle-entry-form";
import { ZoomIn, Download, ArrowLeft, FileText, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useInvoices } from "@/hooks/use-invoices";
import type { Invoice } from "@/lib/types";

type EntryStep = "queue" | "vehicle-selection" | "single" | "multiple";

export default function DataEntry() {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<EntryStep>("queue");
  const [vehicleCount, setVehicleCount] = useState(1);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  
  // Get all invoices (will filter on display if needed)
  const { data: allInvoices, isLoading, refetch } = useInvoices();
  
  // Force refresh when component mounts
  useEffect(() => {
    refetch();
  }, [refetch]);
  
  // Filter for invoices that need data entry
  const invoices = allInvoices?.filter(invoice => 
    invoice.status === "pending_entry" || 
    invoice.vendorName === "Pending Entry"
  );
  
  // Debug logging
  console.log("Data Entry Debug:", {
    allInvoices: allInvoices?.length || 0,
    filteredInvoices: invoices?.length || 0,
    rawData: allInvoices
  });

  const handleInvoiceSelect = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setCurrentStep("vehicle-selection");
  };

  const handleVehicleSelection = (count: number) => {
    setVehicleCount(count);
    setCurrentStep(count === 1 ? "single" : "multiple");
  };

  const handleFormSuccess = () => {
    toast({
      title: "Invoice Submitted",
      description: "Invoice has been submitted for review",
    });
    // Reset to queue for next invoice
    setCurrentStep("queue");
    setSelectedInvoice(null);
  };

  const handleSkipInvoice = () => {
    toast({
      title: "Invoice Skipped",
      description: "Moving to next invoice in queue",
    });
    setCurrentStep("queue");
    setSelectedInvoice(null);
  };

  const handleBackToQueue = () => {
    setCurrentStep("queue");
    setSelectedInvoice(null);
  };

  const handleBackToVehicleSelection = () => {
    setCurrentStep("vehicle-selection");
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        {currentStep !== "queue" && (
          <Button variant="outline" onClick={currentStep === "vehicle-selection" ? handleBackToQueue : handleBackToVehicleSelection}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}
        <div>
          <h1 className="text-2xl font-bold">Data Entry Queue</h1>
          <p className="text-gray-600">
            {currentStep === "queue" && `${invoices?.length || 0} invoices awaiting data entry`}
            {currentStep === "vehicle-selection" && "Select vehicle type for this invoice"}
            {currentStep === "single" && "Enter invoice data for single vehicle"}
            {currentStep === "multiple" && `Enter invoice data for ${vehicleCount} vehicles`}
          </p>
        </div>
      </div>

      {/* Invoice Queue */}
      {currentStep === "queue" && (
        <div className="space-y-4">
          {invoices && invoices.length > 0 ? (
            invoices.map((invoice) => (
              <Card key={invoice.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleInvoiceSelect(invoice)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <FileText className="h-8 w-8 text-gray-400" />
                      <div>
                        <h3 className="font-medium">{invoice.invoiceNumber}</h3>
                        <p className="text-sm text-gray-600">{invoice.description || "No description"}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            Uploaded {new Date(invoice.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">Pending Entry</Badge>
                      <Button className="mt-2">
                        Start Entry
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices in queue</h3>
                <p className="text-gray-600">Upload invoices to begin data entry</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Vehicle Selection */}
      {currentStep === "vehicle-selection" && selectedInvoice && (
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

      {/* Single Vehicle Entry */}
      {currentStep === "single" && selectedInvoice && (
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
              <SimpleInvoiceForm
                onSuccess={handleFormSuccess}
                onCancel={handleSkipInvoice}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Multiple Vehicle Entry */}
      {currentStep === "multiple" && selectedInvoice && (
        <MultiVehicleEntryForm
          vehicleCount={vehicleCount}
          onCancel={handleBackToVehicleSelection}
          onAllComplete={handleFormSuccess}
        />
      )}
    </div>
  );
}

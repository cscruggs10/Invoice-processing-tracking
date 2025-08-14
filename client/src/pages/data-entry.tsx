import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SimpleInvoiceForm } from "@/components/forms/simple-invoice-form";
import { VehicleSelectionForm } from "@/components/forms/vehicle-selection-form";
import { MultiVehicleEntryForm } from "@/components/forms/multi-vehicle-entry-form";
import { InvoicePreview } from "@/components/invoice-preview";
import { ZoomIn, Download, ArrowLeft, FileText, Calendar, Upload } from "lucide-react";
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
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 skeleton"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="modern-card animate-pulse">
                <CardContent className="p-6">
                  <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded skeleton"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {currentStep !== "queue" && (
          <Button 
            variant="outline" 
            onClick={currentStep === "vehicle-selection" ? handleBackToQueue : handleBackToVehicleSelection}
            className="hover-lift"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}
        <div>
          <h1 className="text-3xl font-bold gradient-text">Data Entry Queue</h1>
          <p className="text-muted-foreground mt-2">
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
            invoices.map((invoice, index) => (
              <Card 
                key={invoice.id} 
                className="modern-card hover-lift cursor-pointer border-0 animate-fadeIn" 
                onClick={() => handleInvoiceSelect(invoice)}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                        <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{invoice.invoiceNumber}</h3>
                        <p className="text-sm text-muted-foreground mb-1">
                          {invoice.description || "No description available"}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Uploaded {new Date(invoice.createdAt).toLocaleDateString()}</span>
                          </div>
                          {invoice.vendorName !== "Pending Entry" && (
                            <div className="flex items-center gap-1">
                              <span>•</span>
                              <span>{invoice.vendorName}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <Badge 
                        variant="secondary" 
                        className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                      >
                        Pending Entry
                      </Badge>
                      <div>
                        <Button className="btn-modern gradient-primary text-white">
                          Start Entry
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="modern-card border-0">
              <CardContent className="p-12 text-center">
                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full w-fit mx-auto mb-6">
                  <FileText className="h-12 w-12 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  No invoices in queue
                </h3>
                <p className="text-muted-foreground mb-4">
                  Upload invoices to begin data entry process
                </p>
                <Button variant="outline" className="hover-lift">
                  <Upload className="h-4 w-4 mr-2" />
                  Go to Upload
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Vehicle Selection */}
      {currentStep === "vehicle-selection" && selectedInvoice && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Document Preview */}
          <div>
            <InvoicePreview invoice={selectedInvoice} />
          </div>

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
          <div>
            <InvoicePreview invoice={selectedInvoice} />
          </div>

          {/* Single Vehicle Data Entry Form */}
          <Card>
            <CardHeader>
              <CardTitle>Single Vehicle Invoice</CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleInvoiceForm
                onSuccess={handleFormSuccess}
                onCancel={handleSkipInvoice}
                existingInvoice={selectedInvoice}
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

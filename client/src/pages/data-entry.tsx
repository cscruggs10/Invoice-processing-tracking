import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InvoiceEntryForm } from "@/components/forms/invoice-entry-form";
import { ZoomIn, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function DataEntry() {
  const { toast } = useToast();

  const handleFormSuccess = () => {
    toast({
      title: "Invoice Submitted",
      description: "Invoice has been submitted for review",
    });
  };

  const handleSkipInvoice = () => {
    toast({
      title: "Invoice Skipped",
      description: "Moving to next invoice in queue",
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Data Entry Queue</h1>
        <p className="text-gray-600">Enter invoice data for uploaded documents</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoice Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Preview</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 bg-gray-50">
              <div className="aspect-[4/3] bg-white rounded border flex items-center justify-center mb-4">
                <p className="text-gray-500">Invoice document preview would appear here</p>
              </div>
              <div className="flex justify-center gap-2">
                <Button size="sm" variant="outline">
                  <ZoomIn className="h-4 w-4 mr-2" />
                  Zoom In
                </Button>
                <Button size="sm" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Entry Form */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Data Entry</CardTitle>
          </CardHeader>
          <CardContent>
            <InvoiceEntryForm 
              onSuccess={handleFormSuccess}
              onCancel={handleSkipInvoice}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Eye, CheckCircle2 } from "lucide-react";
import { useInvoices } from "@/hooks/use-invoices";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Export() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportHistory] = useState([
    { filename: "daily_upload_2024-01-14.csv", count: 18, amount: 8750.25 },
    { filename: "daily_upload_2024-01-13.csv", count: 22, amount: 11200.50 },
  ]);

  const { data: approvedInvoices, isLoading } = useInvoices({ 
    status: ["approved"] 
  });
  const { toast } = useToast();

  const totalAmount = approvedInvoices?.reduce((sum, inv) => 
    sum + parseFloat(inv.invoiceAmount.toString()), 0
  ) || 0;

  const handleGenerateExport = async () => {
    if (!approvedInvoices || approvedInvoices.length === 0) {
      toast({
        title: "No Data to Export",
        description: "There are no approved invoices to export",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const response = await apiRequest('POST', '/api/export/csv', {
        userId: 1, // TODO: Get from auth context
      });

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `daily_upload_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export Successful",
        description: `CSV export generated with ${approvedInvoices.length} invoices`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to generate CSV export",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePreviewExport = () => {
    // TODO: Implement preview functionality
    toast({
      title: "Preview",
      description: "Export preview functionality would be implemented here",
    });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Daily CSV Export</h1>
        <p className="text-gray-600">Generate and download daily invoice exports</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Export Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Ready for Export</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <strong>{approvedInvoices?.length || 0} invoices</strong> are approved and ready for export today.
                  <br />
                  <span className="text-sm">Total Amount: ${totalAmount.toFixed(2)}</span>
                </AlertDescription>
              </Alert>

              {approvedInvoices && approvedInvoices.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 font-medium">Invoice #</th>
                        <th className="pb-2 font-medium">Vendor</th>
                        <th className="pb-2 font-medium">Amount</th>
                        <th className="pb-2 font-medium">GL Code</th>
                        <th className="pb-2 font-medium">Approved By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {approvedInvoices.slice(0, 3).map((invoice) => (
                        <tr key={invoice.id} className="border-b">
                          <td className="py-2">{invoice.invoiceNumber}</td>
                          <td className="py-2">{invoice.vendorName}</td>
                          <td className="py-2">${invoice.invoiceAmount}</td>
                          <td className="py-2">{invoice.glCode}</td>
                          <td className="py-2">Admin User</td>
                        </tr>
                      ))}
                      {approvedInvoices.length > 3 && (
                        <tr>
                          <td colSpan={5} className="py-2 text-center text-gray-500">
                            <small>+ {approvedInvoices.length - 3} more invoices...</small>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleGenerateExport}
                  disabled={isExporting || !approvedInvoices || approvedInvoices.length === 0}
                  className="bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? "Generating..." : "Generate CSV Export"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handlePreviewExport}
                  disabled={!approvedInvoices || approvedInvoices.length === 0}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview Export
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Export History */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Export History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {exportHistory.map((export_item, index) => (
                  <div 
                    key={index}
                    className="flex items-start justify-between p-3 border rounded-lg"
                  >
                    <div className="min-w-0 flex-1">
                      <h6 className="font-medium text-sm mb-1 truncate">
                        {export_item.filename}
                      </h6>
                      <p className="text-xs text-gray-600">
                        {export_item.count} invoices • ${export_item.amount.toFixed(2)}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" className="ml-2 flex-shrink-0">
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                
                {exportHistory.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No export history yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

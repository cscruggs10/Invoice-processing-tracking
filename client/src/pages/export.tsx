import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Download, Eye, CheckCircle2, FileSpreadsheet, History, DollarSign, FileText, Calendar } from "lucide-react";
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
      // First, perform VIN lookups and GL code assignments for all approved invoices
      toast({
        title: "Processing VIN Lookups",
        description: "Updating GL codes based on VIN database lookups...",
      });

      for (const invoice of approvedInvoices) {
        if (invoice.vin && invoice.vin.length >= 8) {
          const lastEightDigits = invoice.vin.slice(-8);
          
          try {
            const vinLookupResult = await apiRequest('GET', `/api/vin-lookup/${lastEightDigits}`);
            
            // Update invoice with VIN lookup result and appropriate GL code
            const glCode = vinLookupResult.found ? 
              (vinLookupResult.database === 'wholesale_inventory' ? '1400' :
               vinLookupResult.database === 'retail_inventory' ? '2100' :
               vinLookupResult.database === 'sold' ? '2200' : 
               vinLookupResult.database === 'current_account' ? '2300' : '2400') : '2400';

            await apiRequest('PATCH', `/api/invoices/${invoice.id}`, {
              glCode,
              vinLookupResult: vinLookupResult
            });
          } catch (error) {
            console.error(`VIN lookup failed for invoice ${invoice.id}:`, error);
            // Assign default GL code if lookup fails
            await apiRequest('PATCH', `/api/invoices/${invoice.id}`, {
              glCode: '2400',
              vinLookupResult: { found: false }
            });
          }
        } else {
          // No VIN or invalid VIN - assign default GL code
          await apiRequest('PATCH', `/api/invoices/${invoice.id}`, {
            glCode: '2400',
            vinLookupResult: { found: false }
          });
        }
      }

      toast({
        title: "Generating Export",
        description: "Creating CSV file with updated GL codes...",
      });

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
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 skeleton"></div>
          <Card className="modern-card animate-pulse">
            <CardContent className="p-6">
              <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded skeleton"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Daily Export</h1>
        <p className="text-muted-foreground mt-2">Generate and download daily invoice exports in CSV format</p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="modern-card hover-lift border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{approvedInvoices?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Ready to Export</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card hover-lift border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  ${totalAmount.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">Total Value</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card hover-lift border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <FileSpreadsheet className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">CSV</p>
                <p className="text-sm text-muted-foreground">Export Format</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Export Section */}
        <div className="lg:col-span-2">
          <Card className="modern-card border-0">
            <CardHeader className="border-b border-gray-100 dark:border-gray-800">
              <CardTitle className="text-xl flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-purple-600" />
                Ready for Export
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  <strong>{approvedInvoices?.length || 0} invoices</strong> are approved and ready for export today.
                  <br />
                  <span className="text-sm">Total Amount: <strong>${totalAmount.toFixed(2)}</strong></span>
                </AlertDescription>
              </Alert>

              {approvedInvoices && approvedInvoices.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">Preview ({approvedInvoices.length} invoices)</h4>
                  <div className="space-y-3">
                    {approvedInvoices.slice(0, 3).map((invoice, index) => (
                      <div 
                        key={invoice.id} 
                        className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover-lift transition-all animate-fadeIn"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                          <div>
                            <p className="font-semibold text-sm">{invoice.invoiceNumber}</p>
                            <p className="text-xs text-muted-foreground">Invoice #</p>
                          </div>
                          <div>
                            <p className="font-medium text-sm">{invoice.vendorName}</p>
                            <p className="text-xs text-muted-foreground">Vendor</p>
                          </div>
                          <div>
                            <p className="font-semibold text-green-600 text-sm">${invoice.invoiceAmount}</p>
                            <p className="text-xs text-muted-foreground">Amount</p>
                          </div>
                          <div>
                            {invoice.glCode ? (
                              <Badge variant="default" className="text-xs">{invoice.glCode}</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Auto-assign</Badge>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">GL Code</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Admin User</p>
                            <p className="text-xs text-muted-foreground">Approved By</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {approvedInvoices.length > 3 && (
                      <div className="text-center py-3 text-muted-foreground bg-gray-50 dark:bg-gray-800/30 rounded-lg">
                        <FileText className="h-5 w-5 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">+ {approvedInvoices.length - 3} more invoices will be included in export</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full w-fit mx-auto mb-6">
                    <FileSpreadsheet className="h-12 w-12 text-gray-400 dark:text-gray-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    No Approved Invoices
                  </h3>
                  <p className="text-muted-foreground">
                    There are no approved invoices ready for export
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-6">
                <Button 
                  onClick={handleGenerateExport}
                  disabled={isExporting || !approvedInvoices || approvedInvoices.length === 0}
                  className="btn-modern bg-green-600 hover:bg-green-700 text-white hover-lift flex-1 sm:flex-initial"
                  size="lg"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? "Generating Export..." : "Generate CSV Export"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handlePreviewExport}
                  disabled={!approvedInvoices || approvedInvoices.length === 0}
                  className="hover-lift"
                  size="lg"
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
          <Card className="modern-card border-0">
            <CardHeader className="border-b border-gray-100 dark:border-gray-800">
              <CardTitle className="text-xl flex items-center gap-2">
                <History className="h-5 w-5 text-blue-600" />
                Export History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {exportHistory.map((export_item, index) => (
                  <div 
                    key={index}
                    className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover-lift transition-all animate-fadeIn"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
                          <FileSpreadsheet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h6 className="font-semibold text-sm mb-1 truncate">
                            {export_item.filename}
                          </h6>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              <span>{export_item.count} invoices</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              <span>${export_item.amount.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>Today</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="ml-3 flex-shrink-0 hover-lift">
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {exportHistory.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full w-fit mx-auto mb-6">
                      <History className="h-12 w-12 text-gray-400 dark:text-gray-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      No Export History
                    </h3>
                    <p className="text-muted-foreground">
                      Past exports will appear here
                    </p>
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

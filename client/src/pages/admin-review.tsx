import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Shield, AlertTriangle, CheckCircle, DollarSign, FileText } from "lucide-react";
import { useInvoices } from "@/hooks/use-invoices";
import { AdminEditModal } from "@/components/modals/admin-edit-modal";
import type { Invoice } from "@/lib/types";

export default function AdminReview() {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const { data: invoices, isLoading } = useInvoices({ 
    status: ["admin_review"] 
  });

  const handleEditInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsEditModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsEditModalOpen(false);
    setSelectedInvoice(null);
  };

  const getStatusBadgeVariant = (database?: string) => {
    switch (database) {
      case "sold":
        return "secondary";
      case "current_account":
        return "outline";
      default:
        return "destructive";
    }
  };

  const getStatusText = (vinLookupResult: any) => {
    if (!vinLookupResult?.found) {
      return "Not found";
    }
    return `Found in ${vinLookupResult.database}`;
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
        <h1 className="text-3xl font-bold gradient-text">Admin Review Queue</h1>
        <p className="text-muted-foreground mt-2">Invoices requiring manual GL code assignment and VIN lookup resolution</p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="modern-card hover-lift border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{invoices?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Needs Review</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card hover-lift border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">
                  ${invoices?.reduce((sum, inv) => sum + parseFloat(inv.invoiceAmount), 0).toFixed(2) || "0.00"}
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
                <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">Admin</p>
                <p className="text-sm text-muted-foreground">Access Level</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="modern-card border-0">
        <CardHeader className="border-b border-gray-100 dark:border-gray-800">
          <CardTitle className="text-xl flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            VIN Lookup Failed - Manual Review Required
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(!invoices || invoices.length === 0) ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full w-fit mx-auto mb-6">
                <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                All Clear!
              </h3>
              <p className="text-muted-foreground">
                No invoices requiring admin review at this time
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {invoices.map((invoice, index) => (
                <div 
                  key={invoice.id} 
                  className="p-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors animate-fadeIn"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                        <FileText className="h-5 w-5 text-red-600 dark:text-red-400" />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 flex-1">
                        <div>
                          <p className="font-semibold">{invoice.invoiceNumber}</p>
                          <p className="text-sm text-muted-foreground">{invoice.vendorName}</p>
                        </div>
                        
                        <div>
                          <p className="font-semibold text-green-600">${invoice.invoiceAmount}</p>
                          <p className="text-sm text-muted-foreground">Amount</p>
                        </div>
                        
                        <div>
                          <p className="font-mono text-sm">{invoice.vin}</p>
                          <p className="text-sm text-muted-foreground">VIN</p>
                        </div>
                        
                        <div>
                          <Badge variant={getStatusBadgeVariant(invoice.vinLookupResult?.database)}>
                            {getStatusText(invoice.vinLookupResult)}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {invoice.vinLookupResult?.daysSinceUpdate 
                              ? `${invoice.vinLookupResult.daysSinceUpdate} days ago`
                              : "No date"
                            }
                          </p>
                        </div>
                        
                        <div className="flex items-center">
                          <Button 
                            size="sm" 
                            onClick={() => handleEditInvoice(invoice)}
                            className="btn-modern gradient-primary text-white hover-lift"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit & Assign GL
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin Edit Modal */}
      <AdminEditModal 
        isOpen={isEditModalOpen}
        onClose={handleCloseModal}
        invoice={selectedInvoice}
      />
    </div>
  );
}

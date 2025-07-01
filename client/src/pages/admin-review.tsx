import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit } from "lucide-react";
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
        <h1 className="text-2xl font-bold">Admin Review Queue</h1>
        <p className="text-gray-600">Invoices requiring manual GL code assignment</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>VIN Lookup Failed - Manual Review Required</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-medium">Invoice #</th>
                  <th className="pb-3 font-medium">Vendor</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">VIN</th>
                  <th className="pb-3 font-medium">Database Status</th>
                  <th className="pb-3 font-medium">Days Since Update</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices?.map((invoice) => (
                  <tr key={invoice.id} className="border-b">
                    <td className="py-3">{invoice.invoiceNumber}</td>
                    <td className="py-3">{invoice.vendorName}</td>
                    <td className="py-3">${invoice.invoiceAmount}</td>
                    <td className="py-3">{invoice.vin}</td>
                    <td className="py-3">
                      <Badge variant={getStatusBadgeVariant(invoice.vinLookupResult?.database)}>
                        {getStatusText(invoice.vinLookupResult)}
                      </Badge>
                    </td>
                    <td className="py-3">
                      {invoice.vinLookupResult?.daysSinceUpdate 
                        ? `${invoice.vinLookupResult.daysSinceUpdate} days`
                        : "N/A"
                      }
                    </td>
                    <td className="py-3">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEditInvoice(invoice)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit & Assign GL
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {(!invoices || invoices.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                No invoices requiring admin review
              </div>
            )}
          </div>
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

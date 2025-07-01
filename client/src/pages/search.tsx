import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, RotateCcw, Download, Eye, History } from "lucide-react";
import { useInvoices } from "@/hooks/use-invoices";
import type { InvoiceStatus } from "@/lib/types";

export default function SearchPage() {
  const [filters, setFilters] = useState({
    vendorName: "",
    invoiceNumber: "", 
    dateFrom: "",
    dateTo: "",
    status: "" as InvoiceStatus | "",
  });

  const { data: invoices, isLoading } = useInvoices(
    Object.keys(filters).some(key => filters[key as keyof typeof filters]) 
      ? {
          vendorName: filters.vendorName || undefined,
          invoiceNumber: filters.invoiceNumber || undefined,
          startDate: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
          endDate: filters.dateTo ? new Date(filters.dateTo) : undefined,
          status: filters.status ? [filters.status] : undefined,
        }
      : undefined
  );

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      vendorName: "",
      invoiceNumber: "",
      dateFrom: "",
      dateTo: "",
      status: "",
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "finalized":
        return "default";
      case "paid":
        return "secondary";
      case "approved":
        return "outline";
      default:
        return "outline";
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Search & Archive</h1>
        <p className="text-gray-600">Search, filter, and manage all invoices</p>
      </div>

      {/* Search Panel */}
      <Card>
        <CardContent className="pt-6">
          <form className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vendorName">Vendor Name</Label>
              <Input
                id="vendorName"
                placeholder="Search vendor"
                value={filters.vendorName}
                onChange={(e) => handleFilterChange("vendorName", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">Invoice Number</Label>
              <Input
                id="invoiceNumber"
                placeholder="Invoice #"
                value={filters.invoiceNumber}
                onChange={(e) => handleFilterChange("invoiceNumber", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateFrom">Date From</Label>
              <Input
                id="dateFrom"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateTo">Date To</Label>
              <Input
                id="dateTo"
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange("dateTo", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange("status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  <SelectItem value="pending_entry">Pending Entry</SelectItem>
                  <SelectItem value="pending_review">Pending Review</SelectItem>
                  <SelectItem value="admin_review">Admin Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="finalized">Finalized</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-full flex gap-2">
              <Button type="button">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button type="button" variant="outline" onClick={handleClearFilters}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Search Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Search Results</CardTitle>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              Export Results
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-gray-600 mt-2">Searching...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium">Invoice #</th>
                    <th className="pb-3 font-medium">Vendor</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">VIN</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">GL Code</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices?.map((invoice) => (
                    <tr key={invoice.id} className="border-b">
                      <td className="py-3">{invoice.invoiceNumber}</td>
                      <td className="py-3">{invoice.vendorName}</td>
                      <td className="py-3">
                        {new Date(invoice.invoiceDate).toLocaleDateString()}
                      </td>
                      <td className="py-3">${invoice.invoiceAmount}</td>
                      <td className="py-3">{invoice.vin}</td>
                      <td className="py-3">
                        <Badge variant={getStatusBadgeVariant(invoice.status)}>
                          {formatStatus(invoice.status)}
                        </Badge>
                      </td>
                      <td className="py-3">{invoice.glCode || "—"}</td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <History className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {(!invoices || invoices.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  {Object.values(filters).some(f => f) 
                    ? "No invoices found matching the search criteria"
                    : "Enter search criteria to find invoices"
                  }
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

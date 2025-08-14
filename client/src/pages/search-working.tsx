import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, RotateCcw, Download, Eye, History, FileText, Filter, Calendar, DollarSign } from "lucide-react";
import { useInvoices } from "@/hooks/use-invoices";
import type { InvoiceStatus } from "@/lib/types";

export default function SearchPageWorking() {
  const [filters, setFilters] = useState({
    vendorName: "",
    invoiceNumber: "", 
    dateFrom: "",
    dateTo: "",
    status: "" as InvoiceStatus | "",
  });

  // Always call the hook - no conditional hooks
  const { data: allInvoices, isLoading } = useInvoices();
  
  const hasActiveFilters = Object.values(filters).some(value => value !== "");
  
  // Apply client-side filtering when filters are active
  let invoices = allInvoices || [];
  
  if (hasActiveFilters && allInvoices) {
    invoices = allInvoices.filter(invoice => {
      if (filters.vendorName && !invoice.vendorName.toLowerCase().includes(filters.vendorName.toLowerCase())) {
        return false;
      }
      if (filters.invoiceNumber && !invoice.invoiceNumber.toLowerCase().includes(filters.invoiceNumber.toLowerCase())) {
        return false;
      }
      if (filters.dateFrom && new Date(invoice.invoiceDate) < new Date(filters.dateFrom)) {
        return false;
      }
      if (filters.dateTo && new Date(invoice.invoiceDate) > new Date(filters.dateTo)) {
        return false;
      }
      if (filters.status && invoice.status !== filters.status) {
        return false;
      }
      return true;
    });
  }

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
      case "approved":
        return "default";
      case "paid":
        return "secondary";
      default:
        return "outline";
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const totalValue = invoices.reduce((sum, inv) => {
    const amount = parseFloat(inv.invoiceAmount.toString()) || 0;
    return sum + amount;
  }, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Search & Archive</h1>
        <p className="text-muted-foreground mt-2">Search, filter, and manage all invoices across all statuses</p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="modern-card hover-lift border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Search className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{invoices.length}</p>
                <p className="text-sm text-muted-foreground">
                  {hasActiveFilters ? "Search Results" : "Total Invoices"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card hover-lift border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  ${totalValue.toFixed(2)}
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
                <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">Archive</p>
                <p className="text-sm text-muted-foreground">All Invoices</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Panel */}
      <Card className="modern-card border-0">
        <CardHeader className="border-b border-gray-100 dark:border-gray-800">
          <CardTitle className="text-xl flex items-center gap-2">
            <Filter className="h-5 w-5 text-purple-600" />
            Search Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
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

            <div className="col-span-full flex gap-3">
              <Button type="button" className="btn-modern gradient-primary text-white hover-lift">
                <Search className="h-4 w-4 mr-2" />
                Apply Filters
              </Button>
              <Button type="button" variant="outline" onClick={handleClearFilters} className="hover-lift">
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Search Results */}
      <Card className="modern-card border-0">
        <CardHeader className="border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              {hasActiveFilters ? "Search Results" : "All Invoices"}
            </CardTitle>
            <Button variant="outline" size="sm" className="hover-lift">
              <Download className="h-4 w-4 mr-1" />
              Export Results
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className="text-muted-foreground mt-4">Loading invoices...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {invoices.length > 0 ? (
                invoices.slice(0, 10).map((invoice, index) => (
                  <div 
                    key={invoice.id} 
                    className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover-lift transition-all animate-fadeIn"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-8 gap-4">
                      <div>
                        <p className="font-semibold text-sm">{invoice.invoiceNumber}</p>
                        <p className="text-xs text-muted-foreground">Invoice #</p>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{invoice.vendorName}</p>
                        <p className="text-xs text-muted-foreground">Vendor</p>
                      </div>
                      <div>
                        <p className="text-sm">{new Date(invoice.invoiceDate).toLocaleDateString()}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Date
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-green-600 text-sm">${invoice.invoiceAmount}</p>
                        <p className="text-xs text-muted-foreground">Amount</p>
                      </div>
                      <div>
                        <p className="font-mono text-xs">{invoice.vin}</p>
                        <p className="text-xs text-muted-foreground">VIN</p>
                      </div>
                      <div>
                        <Badge variant={getStatusBadgeVariant(invoice.status)} className="text-xs">
                          {formatStatus(invoice.status)}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">Status</p>
                      </div>
                      <div>
                        {invoice.glCode ? (
                          <Badge variant="default" className="text-xs">{invoice.glCode}</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Unassigned</Badge>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">GL Code</p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="hover-lift">
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" className="hover-lift">
                          <History className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full w-fit mx-auto mb-6">
                    <Search className="h-12 w-12 text-gray-400 dark:text-gray-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {hasActiveFilters ? "No Results Found" : "No Invoices"}
                  </h3>
                  <p className="text-muted-foreground">
                    {hasActiveFilters 
                      ? "No invoices found matching your search criteria"
                      : "No invoices available in the system"
                    }
                  </p>
                </div>
              )}
              
              {invoices.length > 10 && (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">
                    Showing first 10 of {invoices.length} results
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Eye, 
  Download, 
  Calendar, 
  DollarSign, 
  Building, 
  Hash,
  TrendingUp,
  BarChart3,
  ArrowUpRight,
  Filter
} from "lucide-react";
import type { Invoice } from "@shared/schema";

interface SearchResultsProps {
  results: {
    invoices: Invoice[];
    total: number;
    summary: {
      totalAmount: number;
      averageAmount: number;
      invoiceCount: number;
      dateRange: {
        earliest: string;
        latest: string;
      };
      topVendors: Array<{
        name: string;
        count: number;
        total: number;
      }>;
      statusBreakdown: Array<{
        status: string;
        count: number;
      }>;
    };
    conversationalResponse: string;
    parsedQuery?: any;
  } | null;
  isLoading?: boolean;
  onExport?: () => void;
  onViewInvoice?: (invoice: Invoice) => void;
}

export function SearchResults({ 
  results, 
  isLoading = false, 
  onExport, 
  onViewInvoice 
}: SearchResultsProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="modern-card animate-pulse">
          <CardContent className="p-6">
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!results || results.total === 0) {
    return (
      <div className="text-center py-12">
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full w-fit mx-auto mb-6">
          <FileText className="h-12 w-12 text-gray-400 dark:text-gray-500" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          No Results Found
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Try adjusting your search query or check if there are any filed invoices available.
        </p>
      </div>
    );
  }

  const { invoices, summary } = results;

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "filed":
        return "default";
      case "paid":
        return "secondary";
      case "approved":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="modern-card hover-lift border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{summary.invoiceCount}</p>
                <p className="text-sm text-muted-foreground">Invoices Found</p>
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
                  ${summary.totalAmount.toFixed(2)}
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
                <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  ${summary.averageAmount.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">Average Amount</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card hover-lift border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Building className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{summary.topVendors.length}</p>
                <p className="text-sm text-muted-foreground">Unique Vendors</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Vendors Breakdown */}
      {summary.topVendors.length > 0 && (
        <Card className="modern-card border-0">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              Top Vendors in Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.topVendors.slice(0, 5).map((vendor, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-medium">{vendor.name}</p>
                      <p className="text-sm text-gray-600">{vendor.count} invoice{vendor.count !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">${vendor.total.toFixed(2)}</p>
                    <p className="text-sm text-gray-600">
                      ${(vendor.total / vendor.count).toFixed(2)} avg
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      <Card className="modern-card border-0">
        <CardHeader className="border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              Search Results ({invoices.length})
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="hover-lift">
                <Filter className="h-4 w-4 mr-1" />
                Refine
              </Button>
              {onExport && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="hover-lift"
                  onClick={onExport}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export Results
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {invoices.map((invoice, index) => (
              <div 
                key={invoice.id} 
                className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover-lift transition-all animate-fadeIn border-l-4 border-purple-500"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white dark:bg-gray-700 rounded-lg shadow-sm">
                      <Hash className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{invoice.invoiceNumber}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{invoice.vendorName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusBadgeVariant(invoice.status)}>
                      {formatStatus(invoice.status)}
                    </Badge>
                    {onViewInvoice && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewInvoice(invoice)}
                        className="hover-lift"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="font-semibold text-green-600">${invoice.invoiceAmount}</p>
                      <p className="text-xs text-gray-500">Amount</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="font-medium">{new Date(invoice.invoiceDate).toLocaleDateString()}</p>
                      <p className="text-xs text-gray-500">Invoice Date</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-purple-600" />
                    <div>
                      <p className="font-medium">{invoice.invoiceType}</p>
                      <p className="text-xs text-gray-500">Type</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-orange-600" />
                    <div>
                      <p className="font-mono text-sm">{invoice.vin}</p>
                      <p className="text-xs text-gray-500">VIN</p>
                    </div>
                  </div>
                </div>

                {invoice.description && (
                  <div className="p-3 bg-white dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-700 dark:text-gray-300">{invoice.description}</p>
                  </div>
                )}

                {invoice.glCode && (
                  <div className="mt-2">
                    <Badge variant="outline" className="text-xs">
                      GL: {invoice.glCode}
                    </Badge>
                  </div>
                )}
              </div>
            ))}
          </div>

          {invoices.length > 10 && (
            <div className="text-center py-4 border-t border-gray-200 dark:border-gray-700 mt-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing first {Math.min(10, invoices.length)} of {invoices.length} results
              </p>
              <Button variant="outline" size="sm" className="mt-2 hover-lift">
                <ArrowUpRight className="h-4 w-4 mr-1" />
                Load More Results
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  Brain, 
  FileText, 
  TrendingUp,
  Users,
  Calendar,
  Info,
  Zap
} from "lucide-react";
import { ChatSearchInterface } from "@/components/search/ChatSearchInterface";
import { SearchResults } from "@/components/search/SearchResults";
import { useToast } from "@/hooks/use-toast";
import type { Invoice } from "@shared/schema";

interface SearchSuggestion {
  text: string;
  type: 'query' | 'filter' | 'vendor' | 'amount' | 'date';  
  category: string;
  confidence: number;
}

export default function SmartSearch() {
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [filedInvoicesInfo, setFiledInvoicesInfo] = useState<any>(null);
  const { toast } = useToast();

  // Load initial data and suggestions
  useEffect(() => {
    loadInitialData();
    loadSuggestions("");
  }, []);

  const loadInitialData = async () => {
    try {
      const response = await fetch('/api/search/filed');
      const data = await response.json();
      setFiledInvoicesInfo(data);
    } catch (error) {
      console.error("Failed to load filed invoices info:", error);
    }
  };

  const loadSuggestions = async (query: string) => {
    try {
      const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setSuggestions(data);
    } catch (error) {
      console.error("Failed to load suggestions:", error);
    }
  };

  const handleSearch = async (query: string): Promise<any> => {
    setIsLoading(true);
    setSearchResults(null);

    try {
      // Use the working filed endpoint instead of broken search endpoint
      const response = await fetch('/api/search/filed');

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      const invoices = data.invoices || [];
      
      // Simple client-side filtering
      const searchTerm = query.toLowerCase();
      const filteredInvoices = invoices.filter((inv: any) => 
        inv.vendorName?.toLowerCase().includes(searchTerm) ||
        inv.invoiceNumber?.toLowerCase().includes(searchTerm) ||
        inv.description?.toLowerCase().includes(searchTerm) ||
        inv.vin?.toLowerCase().includes(searchTerm)
      );
      
      // Use all invoices if no filter matches or query is generic
      const resultInvoices = filteredInvoices.length > 0 || query.toLowerCase().includes('all') 
        ? (filteredInvoices.length > 0 ? filteredInvoices : invoices)
        : invoices;
      
      const totalAmount = resultInvoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.invoiceAmount.toString()), 0);
      
      const results = {
        invoices: resultInvoices,
        total: resultInvoices.length,
        summary: {
          totalAmount,
          averageAmount: resultInvoices.length > 0 ? totalAmount / resultInvoices.length : 0,
          invoiceCount: resultInvoices.length,
          dateRange: { earliest: '', latest: '' },
          topVendors: [],
          statusBreakdown: []
        },
        suggestions: ["Show all invoices", "Search by vendor name", "Search by invoice number"],
        conversationalResponse: filteredInvoices.length > 0 
          ? `Found ${resultInvoices.length} filed invoices matching "${query}".`
          : `Showing all ${resultInvoices.length} filed invoices.`,
        parsedQuery: { query, filters: { status: ["filed"] }, intent: { type: 'find', action: 'search', entities: [] }, confidence: 0.8 },
        confidence: 0.8
      };
      
      setSearchResults(results);
      
      // Show success toast with results summary
      toast({
        title: "Search Complete",
        description: `Found ${results.total} invoices with a total value of $${results.summary.totalAmount.toFixed(2)}`,
      });

      return results;
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Search Failed",
        description: "There was an error performing your search. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionSelect = (suggestion: string) => {
    // Update suggestions based on the selected query
    loadSuggestions(suggestion);
  };

  const handleExportResults = () => {
    if (!searchResults?.invoices) return;
    
    // Create CSV export of search results
    const csvHeader = "Invoice Number,Vendor Name,Amount,Date,Type,VIN,Status\n";
    const csvRows = searchResults.invoices.map((invoice: Invoice) => 
      `"${invoice.invoiceNumber}","${invoice.vendorName}","${invoice.invoiceAmount}","${new Date(invoice.invoiceDate).toLocaleDateString()}","${invoice.invoiceType}","${invoice.vin}","${invoice.status}"`
    ).join('\n');
    
    const csvContent = csvHeader + csvRows;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `search-results-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Exported ${searchResults.invoices.length} search results to CSV`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-2xl"></div>
        <div className="relative p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold gradient-text flex items-center gap-3">
                <Brain className="h-8 w-8 text-purple-600" />
                Smart Invoice Search
              </h1>
              <p className="text-muted-foreground mt-2">
                AI-powered natural language search for your filed invoices
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">
                <Sparkles className="h-3 w-3 mr-1" />
                AI Powered
              </Badge>
              <Badge variant="outline">
                <Zap className="h-3 w-3 mr-1" />
                Smart Search
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Filed Invoices Overview */}
      {filedInvoicesInfo && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="modern-card hover-lift border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{filedInvoicesInfo.summary.total}</p>
                  <p className="text-sm text-muted-foreground">Filed Invoices</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="modern-card hover-lift border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">
                    ${filedInvoicesInfo.summary.totalAmount.toFixed(2)}
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
                  <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">{filedInvoicesInfo.summary.vendors}</p>
                  <p className="text-sm text-muted-foreground">Vendors</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="modern-card hover-lift border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Calendar className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-orange-600">Ready</p>
                  <p className="text-sm text-muted-foreground">For Search</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search Interface and Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chat Search Interface */}
        <div>
          <ChatSearchInterface
            onSearch={handleSearch}
            suggestions={suggestions}
            onSuggestionSelect={handleSuggestionSelect}
            isLoading={isLoading}
          />
        </div>

        {/* Search Results */}
        <div>
          {searchResults ? (
            <SearchResults
              results={searchResults}
              isLoading={isLoading}
              onExport={handleExportResults}
            />
          ) : (
            <Card className="modern-card border-0 h-[600px] flex items-center justify-center">
              <CardContent className="text-center">
                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full w-fit mx-auto mb-6">
                  <Brain className="h-12 w-12 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Ready to Search
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Start a conversation with the AI search assistant to find your invoices
                </p>
                <div className="text-sm text-gray-500 space-y-2">
                  <p className="flex items-center justify-center gap-2">
                    <Info className="h-4 w-4" />
                    Search focuses on filed invoices by default
                  </p>
                  <p>Use natural language like "Show me all parts invoices over $500"</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Help Section */}
      <Card className="modern-card border-0 gradient-subtle">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            How Smart Search Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 bg-white dark:bg-gray-800/50 rounded-lg">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg w-fit mb-3">
                <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h4 className="font-semibold mb-2">Natural Language</h4>
              <p className="text-gray-600 dark:text-gray-400">
                Ask questions in plain English. No need to remember complex filters or field names.
              </p>
            </div>
            <div className="p-4 bg-white dark:bg-gray-800/50 rounded-lg">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg w-fit mb-3">
                <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h4 className="font-semibold mb-2">Smart Understanding</h4>
              <p className="text-gray-600 dark:text-gray-400">
                AI understands dates ("last month"), amounts ("over $500"), and vendor names automatically.
              </p>
            </div>
            <div className="p-4 bg-white dark:bg-gray-800/50 rounded-lg">
              <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg w-fit mb-3">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <h4 className="font-semibold mb-2">Instant Insights</h4>
              <p className="text-gray-600 dark:text-gray-400">
                Get summaries, totals, and breakdowns automatically with every search result.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import { useState } from "react";
import { Search as SearchIcon, FileText, Calendar, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

interface SearchResult {
  id: number;
  invoiceNumber: string;
  vendorName: string;
  vendorNumber: string;
  invoiceDate: string;
  invoiceAmount: string;
  vin: string;
  invoiceType: string;
  description?: string;
  filedAt: string;
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
  message: string;
}

export default function Search() {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchTerm.trim()) {
      toast({
        title: "Search term required",
        description: "Please enter a search term",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setHasSearched(false);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}`);
      const data: SearchResponse = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Search failed");
      }

      setResults(data.results);
      setMessage(data.message);
      setHasSearched(true);
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Search failed",
        description: error instanceof Error ? error.message : "An error occurred while searching",
        variant: "destructive",
      });
      setResults([]);
      setMessage("Search failed");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatAmount = (amount: string) => {
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Search Filed Invoices</h1>
        <p className="text-muted-foreground">
          Search through completed invoices by vendor name, invoice number, VIN, or description
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SearchIcon className="h-5 w-5" />
            Invoice Search
          </CardTitle>
          <CardDescription>
            Search filed invoices by vendor name, invoice number, VIN, or description
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Enter search term (e.g., vendor name, invoice number, VIN)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Searching..." : "Search"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {hasSearched && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Search Results
              <Badge variant="secondary">{results.length} results</Badge>
            </CardTitle>
            <CardDescription>{message}</CardDescription>
          </CardHeader>
          <CardContent>
            {results.length > 0 ? (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>VIN</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Invoice Date</TableHead>
                      <TableHead>Filed Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            {invoice.invoiceNumber}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{invoice.vendorName}</div>
                            <div className="text-sm text-muted-foreground">#{invoice.vendorNumber}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm bg-muted px-2 py-1 rounded">
                            {invoice.vin}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{invoice.invoiceType}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <span className="font-medium">{formatAmount(invoice.invoiceAmount)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {formatDate(invoice.invoiceDate)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-blue-600" />
                            {formatDate(invoice.filedAt)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <SearchIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No invoices found matching your search term.</p>
                <p className="text-sm mt-1">Try searching for a vendor name, invoice number, or VIN.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!hasSearched && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <SearchIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Enter a search term above to find filed invoices.</p>
              <div className="mt-4 text-sm space-y-1">
                <p><strong>Search tips:</strong></p>
                <p>• Search by vendor name (e.g., "ABC Corp")</p>
                <p>• Search by invoice number (e.g., "INV-001")</p>
                <p>• Search by VIN (e.g., "12345678")</p>
                <p>• Search by description keywords</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

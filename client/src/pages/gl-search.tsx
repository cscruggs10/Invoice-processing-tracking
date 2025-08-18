import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, Database, FileDown, Clock, CheckCircle, XCircle, AlertTriangle, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GLResult {
  found: boolean;
  database?: string;
  gl_code?: string;
  export_file?: string;
  priority?: number;
  stock_number?: string;
  details?: any;
  searched_vin?: string;
  padded_vin?: string;
  message?: string;
}

export default function GLSearch() {
  const [vin, setVin] = useState("");
  const [result, setResult] = useState<GLResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [uploadingDb, setUploadingDb] = useState<string | null>(null);
  const [dbCounts, setDbCounts] = useState<Record<string, number>>({});
  const [dragOverDb, setDragOverDb] = useState<string | null>(null);
  const { toast } = useToast();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    checkDatabaseStatus();
    fetchDatabaseCounts();
  }, []);

  const checkDatabaseStatus = async () => {
    try {
      const response = await fetch('/api/database-status');
      const data = await response.json();
      if (data.connected) {
        setDbStatus('connected');
      } else {
        setDbStatus('error');
      }
    } catch (error) {
      setDbStatus('error');
    }
  };

  const fetchDatabaseCounts = async () => {
    try {
      const response = await fetch('/api/database-counts');
      const counts = await response.json();
      setDbCounts(counts);
    } catch (error) {
      console.error('Failed to fetch database counts:', error);
    }
  };

  const handleUploadClick = (databaseKey: string) => {
    const fileInput = fileInputRefs.current[databaseKey];
    if (fileInput) {
      fileInput.click();
    }
  };

  const uploadFile = async (file: File, databaseKey: string) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "Invalid File",
        description: "Please select a CSV file",
        variant: "destructive",
      });
      return;
    }

    setUploadingDb(databaseKey);
    
    try {
      const formData = new FormData();
      formData.append('csvFile', file);

      const response = await fetch(`/api/upload-csv/${databaseKey}`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Upload Successful",
          description: `${result.message} (${result.records} records)`,
        });
        // Refresh database counts
        await fetchDatabaseCounts();
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload CSV file",
        variant: "destructive",
      });
    } finally {
      setUploadingDb(null);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, databaseKey: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await uploadFile(file, databaseKey);
    
    // Reset file input
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleDragOver = (event: React.DragEvent, databaseKey: string) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOverDb(databaseKey);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOverDb(null);
  };

  const handleDrop = async (event: React.DragEvent, databaseKey: string) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOverDb(null);

    const files = Array.from(event.dataTransfer.files);
    if (files.length === 0) return;

    const file = files[0];
    await uploadFile(file, databaseKey);
  };

  const handleSearch = async () => {
    if (!vin.trim()) {
      toast({
        title: "VIN Required",
        description: "Please enter a VIN to search",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/gl-lookup/${vin.trim()}`);
      const data = await response.json();
      setResult(data);
      
      if (data.found) {
        toast({
          title: "VIN Found!",
          description: `Found in ${data.database} with GL code ${data.gl_code}`,
        });
      } else {
        toast({
          title: "VIN Not Found",
          description: "VIN not found in any database",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('GL search error:', error);
      toast({
        title: "Search Error",
        description: "Failed to search VIN. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDatabaseDisplayName = (db: string) => {
    switch (db) {
      case 'wholesale_inventory': return 'Wholesale Inventory';
      case 'retail_inventory': return 'Retail Inventory';
      case 'active_account': return 'Active Account';
      case 'retail_sold': return 'Retail Sold';
      case 'wholesale_sold': return 'Wholesale Sold';
      default: return db;
    }
  };

  const getPriorityBadge = (priority: number) => {
    switch (priority) {
      case 1: return <Badge className="bg-green-500">Priority 1 (Inventory)</Badge>;
      case 2: return <Badge className="bg-blue-500">Priority 2 (Active Account)</Badge>;
      case 3: return <Badge className="bg-yellow-500">Priority 3 (Sold)</Badge>;
      default: return <Badge variant="outline">Unknown Priority</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text">GL Code Search</h1>
        <p className="text-muted-foreground mt-2">
          Search VIN across all databases to test GL code assignment logic
        </p>
      </div>

      {dbStatus === 'error' && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Database connection error. Please check server logs and database configuration.
          </AlertDescription>
        </Alert>
      )}

      {dbStatus === 'connected' && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Database connected successfully. All VIN databases are loaded with data.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Search Form */}
        <Card className="modern-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              VIN Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vin">VIN (Last 6-8 digits or full VIN)</Label>
              <Input
                id="vin"
                value={vin}
                onChange={(e) => setVin(e.target.value)}
                placeholder="Enter VIN (e.g., 123456 or 12345678)"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            
            <Button 
              onClick={handleSearch} 
              disabled={loading}
              className="w-full btn-modern gradient-primary text-white"
            >
              {loading ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search GL Code
                </>
              )}
            </Button>

            <Alert>
              <Database className="h-4 w-4" />
              <AlertDescription>
                <strong>Search Logic:</strong>
                <ol className="mt-2 space-y-1 text-sm">
                  <li>1. Wholesale/Retail Inventory (GL: 1400)</li>
                  <li>2. Active Account (GL: 1420)</li>
                  <li>3. Most Recent Sold (GL: 5180.x)</li>
                </ol>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Search Results */}
        <Card className="modern-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result?.found ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : result && !result.found ? (
                <XCircle className="h-5 w-5 text-red-500" />
              ) : (
                <Database className="h-5 w-5" />
              )}
              Search Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!result ? (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Enter a VIN above to search for GL codes</p>
              </div>
            ) : result.found ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Database Found:</span>
                  <Badge variant="outline">{getDatabaseDisplayName(result.database!)}</Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-medium">GL Code:</span>
                  <Badge className="bg-purple-500 text-white font-mono text-lg px-3 py-1">
                    {result.gl_code}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-medium">Export File:</span>
                  <Badge variant="secondary" className="capitalize">
                    <FileDown className="h-3 w-3 mr-1" />
                    {result.export_file}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-medium">Priority:</span>
                  {getPriorityBadge(result.priority!)}
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-medium">Stock Number:</span>
                  <Badge variant="outline" className="font-mono">
                    {result.stock_number}
                  </Badge>
                </div>

                {result.details && (
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h4 className="font-medium mb-2">Record Details:</h4>
                    <pre className="text-xs text-muted-foreground overflow-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <XCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
                <p className="font-medium text-red-600">VIN Not Found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Searched VIN: <code>{result.searched_vin}</code>
                </p>
                <p className="text-sm text-muted-foreground">
                  Padded VIN: <code>{result.padded_vin}</code>
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {result.message}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Database Status */}
      <Card className="modern-card border-0">
        <CardHeader>
          <CardTitle>Database Status & Upload</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { name: 'Wholesale Inventory', key: 'wholesale_inventory' },
              { name: 'Retail Inventory', key: 'retail_inventory' },
              { name: 'Active Account', key: 'active_account' },
              { name: 'Retail Sold', key: 'retail_sold' },
              { name: 'Wholesale Sold', key: 'wholesale_sold' }
            ].map((db) => (
              <div 
                key={db.key} 
                className={`p-3 border rounded-lg text-center transition-all duration-200 ${
                  dragOverDb === db.key 
                    ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 border-dashed' 
                    : 'border-gray-200 dark:border-gray-700'
                } ${uploadingDb === db.key ? 'opacity-50' : ''}`}
                onDragOver={(e) => handleDragOver(e, db.key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, db.key)}
              >
                <h4 className="font-medium text-sm mb-2">{db.name}</h4>
                <Badge 
                  variant={dbStatus === 'connected' ? 'default' : 'destructive'} 
                  className={`mb-2 ${dbStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}
                >
                  {dbStatus === 'checking' ? 'Checking...' : 
                   dbStatus === 'connected' ? `${dbCounts[db.key] || 0} Records` : 'DB Error'}
                </Badge>
                
                {dragOverDb === db.key ? (
                  <div className="mb-2 p-2 border-2 border-dashed border-blue-400 rounded bg-blue-50 dark:bg-blue-900/30">
                    <FileDown className="h-4 w-4 mx-auto mb-1 text-blue-500" />
                    <p className="text-xs text-blue-600 dark:text-blue-400">Drop CSV file here</p>
                  </div>
                ) : (
                  <div className="mb-2 p-2 border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-800">
                    <Upload className="h-4 w-4 mx-auto mb-1 text-gray-400" />
                    <p className="text-xs text-gray-500">Drag CSV or click button</p>
                  </div>
                )}
                
                <input
                  type="file"
                  ref={(el) => { fileInputRefs.current[db.key] = el; }}
                  onChange={(e) => handleFileUpload(e, db.key)}
                  accept=".csv"
                  style={{ display: 'none' }}
                />
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full"
                  onClick={() => handleUploadClick(db.key)}
                  disabled={uploadingDb === db.key}
                >
                  {uploadingDb === db.key ? (
                    <>
                      <Clock className="h-3 w-3 mr-1 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3 w-3 mr-1" />
                      Upload CSV
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
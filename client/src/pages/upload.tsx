import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UploadZone } from "@/components/upload/upload-zone";
import { useToast } from "@/hooks/use-toast";

export default function Upload() {
  const [uploadHistory, setUploadHistory] = useState([]);
  
  const { toast } = useToast();

  const handleFileUpload = async (files: File[]) => {
    try {
      // Hardcode Cloudinary config to bypass broken API
      const config = {
        cloudName: 'dcpy2x17s',
        uploadPreset: 'invoice_uploads'
      };
      
      for (const file of files) {
        // Create FormData for streaming upload (DealMachine approach)
        const formData = new FormData();
        formData.append('file', file);
        
        // Upload via our streaming API (works in Vercel serverless)
        const uploadResponse = await fetch('/api/upload-stream', {
          method: 'POST',
          body: formData,
        });
        
        if (!uploadResponse.ok) {
          throw new Error(`Cloudinary upload failed: ${uploadResponse.statusText}`);
        }
        
        const uploadedFile = await uploadResponse.json();
        console.log('Stream upload successful:', uploadedFile);
        
        console.log("File uploaded successfully:", uploadedFile);
        
        // Create placeholder invoice for data entry
        const invoiceResponse = await fetch('/api/invoices', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            invoiceNumber: `UPLOAD-${Date.now()}`,
            vendorName: "Pending Entry",
            vendorNumber: "PENDING",
            invoiceDate: new Date().toISOString().split('T')[0],
            invoiceAmount: "0.00",
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
            vin: "PENDING",
            invoiceType: "Parts",
            description: `Uploaded file: ${file.name}`,
            uploadedBy: 1,
            status: "pending_entry"
          }),
        });
        
        if (!invoiceResponse.ok) {
          throw new Error('Failed to create invoice record');
        }
        
        const invoice = await invoiceResponse.json();
        
        // Link the uploaded file to the invoice
        await fetch(`/api/files/${uploadedFile.id}/invoice`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            invoiceId: invoice.id
          }),
        });
        
        // Add to upload history
        const newUpload = {
          id: invoice.id,
          name: file.name,
          time: new Date().toLocaleString(),
          status: "uploaded" as const,
        };
        
        setUploadHistory(prev => [newUpload, ...prev]);
      }
      
      toast({
        title: "Upload Successful",
        description: `${files.length} file(s) uploaded and added to data entry queue`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: "There was an error uploading your files",
        variant: "destructive",
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "uploaded":
        return "default";
      case "processing":
        return "secondary";
      case "error":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Upload Invoice</h1>
        <p className="text-muted-foreground mt-2">Upload invoice images or PDF files for processing</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Zone */}
        <div className="lg:col-span-2">
          <Card className="modern-card border-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                File Upload
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UploadZone onFileUpload={handleFileUpload} />
            </CardContent>
          </Card>
        </div>

        {/* Upload History & Tips */}
        <div className="space-y-6">
          <Card className="modern-card border-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                Recent Uploads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {uploadHistory.map((upload, index) => (
                  <div 
                    key={upload.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover-lift transition-all animate-fadeIn"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {upload.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {upload.time}
                      </p>
                    </div>
                    <Badge 
                      variant={getStatusBadgeVariant(upload.status)}
                      className="ml-2 flex-shrink-0"
                    >
                      {upload.status}
                    </Badge>
                  </div>
                ))}
                
                {uploadHistory.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <svg className="h-12 w-12 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm font-medium mb-1">No uploads yet</p>
                    <p className="text-xs">Upload files will appear here</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Upload Tips */}
          <Card className="modern-card border-0 gradient-subtle">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                Upload Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Supported formats: <strong>PDF, JPG, PNG</strong></p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Maximum file size: <strong>10MB</strong></p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Multiple files can be uploaded at once</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Files are automatically added to the <strong>Data Entry Queue</strong></p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

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
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', '1'); // TODO: Get from auth context
        
        // Upload file to server
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!uploadResponse.ok) {
          throw new Error('Upload failed');
        }
        
        const uploadedFile = await uploadResponse.json();
        
        // Create invoice record for uploaded file
        const invoiceData = {
          vendorName: "Pending Entry",
          vendorNumber: "TBD",
          invoiceNumber: `UPLOAD-${Date.now()}`,
          invoiceDate: new Date().toISOString().split('T')[0],
          invoiceAmount: "0.00",
          vin: "",
          invoiceType: "Parts",
          description: `Uploaded file: ${file.name}`,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
          uploadedBy: 1,
          status: "pending_entry",
        };
        
        const invoiceResponse = await fetch('/api/invoices', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(invoiceData),
        });
        
        if (!invoiceResponse.ok) {
          throw new Error('Failed to create invoice');
        }
        
        const invoice = await invoiceResponse.json();
        
        // Update uploaded file with invoice ID
        await fetch(`/api/files/${uploadedFile.id}/invoice`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ invoiceId: invoice.id }),
        });
        
        // Add to upload history
        const newUpload = {
          id: uploadedFile.id,
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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upload Invoice</h1>
        <p className="text-gray-600">Upload invoice images or PDF files for processing</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Zone */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>File Upload</CardTitle>
            </CardHeader>
            <CardContent>
              <UploadZone onFileUpload={handleFileUpload} />
            </CardContent>
          </Card>
        </div>

        {/* Upload History */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Upload History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {uploadHistory.map((upload) => (
                  <div 
                    key={upload.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {upload.name}
                      </p>
                      <p className="text-xs text-gray-600">
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
                  <div className="text-center py-8 text-gray-500">
                    No uploads yet
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

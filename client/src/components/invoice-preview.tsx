import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, ZoomIn } from "lucide-react";
import type { Invoice } from "@/lib/types";

interface InvoicePreviewProps {
  invoice: Invoice;
}

interface UploadedFile {
  id: number;
  filename: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
  uploadedBy: number;
  invoiceId: number | null;
  createdAt: Date;
}

export function InvoicePreview({ invoice }: InvoicePreviewProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await fetch(`/api/invoices/${invoice.id}/files`);
        if (response.ok) {
          const fetchedFiles = await response.json();
          setFiles(fetchedFiles);
        }
      } catch (error) {
        console.error("Failed to fetch files:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [invoice.id]);

  const handleFileView = (fileId: number) => {
    window.open(`/api/files/${fileId}`, '_blank');
  };

  const handleFileDownload = (fileId: number, filename: string) => {
    const link = document.createElement('a');
    link.href = `/api/files/${fileId}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Invoice Documents
        </CardTitle>
      </CardHeader>
      <CardContent>
        {files.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No documents found for this invoice</p>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium">{file.originalName}</p>
                    <p className="text-sm text-gray-500">
                      {(file.fileSize / 1024 / 1024).toFixed(1)} MB • {file.mimeType}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFileView(file.id)}
                  >
                    <ZoomIn className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFileDownload(file.id, file.originalName)}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
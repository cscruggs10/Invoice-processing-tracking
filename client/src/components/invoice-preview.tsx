import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
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
  const [zoom, setZoom] = useState(1);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await fetch(`/api/invoices/${invoice.id}/files`);
        if (response.ok) {
          const fetchedFiles = await response.json();
          setFiles(fetchedFiles);
          if (fetchedFiles.length > 0) {
            setSelectedFile(fetchedFiles[0]); // Auto-select first file
          }
        }
      } catch (error) {
        console.error("Failed to fetch files:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [invoice.id]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleZoomReset = () => setZoom(1);

  const handleDownload = (file: UploadedFile) => {
    const link = document.createElement('a');
    link.href = `/api/files/${file.id}`;
    link.download = file.originalName;
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
            Invoice Document
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (files.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice Document
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No document found for this invoice</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice Document
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleZoomReset}>
              {Math.round(zoom * 100)}%
            </Button>
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            {selectedFile && (
              <Button variant="outline" size="sm" onClick={() => handleDownload(selectedFile)}>
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {selectedFile && (
          <div className="border rounded-lg overflow-hidden bg-white">
            {selectedFile.mimeType === 'application/pdf' ? (
              <div className="h-96 w-full">
                <iframe
                  src={`/api/files/${selectedFile.id}#zoom=${zoom * 100}`}
                  width="100%"
                  height="100%"
                  style={{ border: 'none' }}
                  title={selectedFile.originalName}
                />
              </div>
            ) : selectedFile.mimeType.startsWith('image/') ? (
              <div className="flex justify-center items-center h-96 overflow-auto">
                <img
                  src={`/api/files/${selectedFile.id}`}
                  alt={selectedFile.originalName}
                  style={{ 
                    transform: `scale(${zoom})`,
                    maxWidth: 'none',
                    transition: 'transform 0.2s'
                  }}
                  className="max-h-full"
                />
              </div>
            ) : (
              <div className="h-96 flex items-center justify-center">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 mb-2">Preview not available for this file type</p>
                  <Button onClick={() => handleDownload(selectedFile)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download {selectedFile.originalName}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {files.length > 1 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium">Multiple files:</p>
            {files.map((file) => (
              <div
                key={file.id}
                className={`flex items-center justify-between p-2 border rounded cursor-pointer transition-colors ${
                  selectedFile?.id === file.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedFile(file)}
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{file.originalName}</span>
                </div>
                <span className="text-xs text-gray-400">
                  {(file.fileSize / 1024 / 1024).toFixed(1)} MB
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
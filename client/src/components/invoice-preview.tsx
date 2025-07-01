import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, ZoomIn, ZoomOut, RotateCcw, Maximize2 } from "lucide-react";
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
  const handleZoomFit = () => setZoom(0.75); // Fit more content in view

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
            <Button variant="outline" size="sm" onClick={handleZoomFit}>
              <Maximize2 className="h-4 w-4" />
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
          <div className="space-y-4">
            {/* Simple document viewer */}
            <div className="border rounded-lg overflow-hidden bg-white">
              {selectedFile.mimeType === 'application/pdf' ? (
                <div className="relative overflow-auto" style={{ height: '700px' }}>
                  <iframe
                    src={`/api/files/${selectedFile.id}#toolbar=1&navpanes=1&scrollbar=1&page=1&view=FitH&zoom=${zoom * 100}`}
                    width="100%"
                    height="1000px"
                    style={{ border: 'none', minHeight: '1000px' }}
                    title={selectedFile.originalName}
                  />
                </div>
              ) : selectedFile.mimeType.startsWith('image/') ? (
                <div className="flex justify-center bg-gray-50 p-4" style={{ maxHeight: '700px', overflow: 'auto' }}>
                  <img
                    src={`/api/files/${selectedFile.id}`}
                    alt={selectedFile.originalName}
                    style={{ 
                      transform: `scale(${zoom})`,
                      maxWidth: '100%',
                      height: 'auto',
                      transition: 'transform 0.2s ease'
                    }}
                    className="shadow-lg"
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
            
            {/* Instructions for better viewing */}
            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
              <p className="font-medium mb-1">📋 Viewing Tips:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Use + and - buttons to zoom in/out for better detail</li>
                <li>PDF: Use browser's built-in scroll and zoom controls</li>
                <li>Images: Scroll to see different parts when zoomed</li>
                <li>Click "Fit" to see more of the document at once</li>
              </ul>
            </div>
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
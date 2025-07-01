import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, ZoomIn, ZoomOut, Move, Hand } from "lucide-react";
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
  const [zoom, setZoom] = useState(1.2);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [panMode, setPanMode] = useState(false);
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

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

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.5, 4));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.5, 0.8));
  const handleZoomReset = () => {
    setZoom(1.2);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (panMode) {
      setPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (panning && panMode) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(prev => Math.max(0.5, Math.min(4, prev + delta)));
    }
  };

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
            <Button 
              variant={panMode ? "default" : "outline"} 
              size="sm" 
              onClick={() => setPanMode(!panMode)}
              title="Enable pan mode to drag and move the document around"
            >
              <Hand className="h-4 w-4" />
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
              <div 
                className="h-[600px] w-full overflow-auto relative"
                style={{ 
                  cursor: panMode ? (panning ? 'grabbing' : 'grab') : 'default',
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
              >
                <div
                  style={{
                    transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                    transformOrigin: 'top left',
                    transition: panning ? 'none' : 'transform 0.1s ease-out',
                    width: '100%',
                    height: '100%',
                    minWidth: '800px',
                    minHeight: '1000px'
                  }}
                >
                  <iframe
                    src={`/api/files/${selectedFile.id}`}
                    width="100%"
                    height="100%"
                    style={{ 
                      border: 'none',
                      pointerEvents: panMode ? 'none' : 'auto'
                    }}
                    title={selectedFile.originalName}
                  />
                </div>
              </div>
            ) : selectedFile.mimeType.startsWith('image/') ? (
              <div 
                className="h-[600px] w-full overflow-auto relative bg-gray-50"
                style={{ 
                  cursor: panMode ? (panning ? 'grabbing' : 'grab') : 'default',
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
              >
                <div
                  style={{
                    transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
                    transition: panning ? 'none' : 'transform 0.1s ease-out',
                    display: 'inline-block',
                    minWidth: '100%',
                    minHeight: '100%'
                  }}
                >
                  <img
                    src={`/api/files/${selectedFile.id}`}
                    alt={selectedFile.originalName}
                    style={{ 
                      transform: `scale(${zoom})`,
                      transformOrigin: 'top left',
                      maxWidth: 'none',
                      transition: 'transform 0.2s',
                      userSelect: 'none',
                      pointerEvents: panMode ? 'none' : 'auto'
                    }}
                    draggable={false}
                  />
                </div>
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
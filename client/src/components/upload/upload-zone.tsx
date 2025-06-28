import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { CloudUpload } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface UploadZoneProps {
  onFileUpload: (files: File[]) => void;
  className?: string;
}

export function UploadZone({ onFileUpload, className }: UploadZoneProps) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsUploading(false);
            onFileUpload(acceptedFiles);
            return 0;
          }
          return prev + 10;
        });
      }, 200);
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png'],
      'application/pdf': ['.pdf']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true
  });

  return (
    <div className={cn("w-full", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50 cursor-pointer transition-all",
          isDragActive && "border-primary bg-blue-50",
          "hover:border-primary hover:bg-blue-50"
        )}
      >
        <input {...getInputProps()} />
        <CloudUpload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Drop files here or click to browse
        </h3>
        <p className="text-sm text-gray-600">
          Supported formats: PDF, JPG, PNG (Max 10MB)
        </p>
      </div>
      
      {isUploading && (
        <div className="mt-4">
          <Progress value={uploadProgress} className="w-full" />
          <p className="text-sm text-gray-600 mt-2">Uploading files...</p>
        </div>
      )}
    </div>
  );
}

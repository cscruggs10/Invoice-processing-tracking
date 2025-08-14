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
    multiple: true,
    // Better mobile support
    noClick: false,
    noKeyboard: false,
    preventDropOnDocument: true
  });

  return (
    <div className={cn("w-full", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300",
          "bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50",
          "border-gray-300 dark:border-gray-600",
          isDragActive && "border-purple-500 bg-purple-50 dark:bg-purple-900/20 scale-105",
          "hover:border-purple-400 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 hover:scale-[1.02]"
        )}
      >
        <input 
          {...getInputProps()} 
          // Better mobile support
          capture="environment"
          accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png"
        />
        <div className="relative">
          <div className={cn(
            "mx-auto mb-6 p-4 rounded-full transition-all duration-300",
            isDragActive 
              ? "bg-purple-100 dark:bg-purple-900/30" 
              : "bg-gray-200 dark:bg-gray-700"
          )}>
            <CloudUpload className={cn(
              "h-12 w-12 mx-auto transition-colors duration-300",
              isDragActive 
                ? "text-purple-600 dark:text-purple-400" 
                : "text-gray-400 dark:text-gray-500"
            )} />
          </div>
          
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {isDragActive ? "Drop files here!" : "Drop files here or click to browse"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Drag and drop your invoice files or click to select
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              PDF, JPG, PNG • Max 10MB
            </span>
          </div>
        </div>
      </div>
      
      {isUploading && (
        <div className="mt-6 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Uploading files...
            </span>
            <span className="text-sm text-muted-foreground">
              {uploadProgress}%
            </span>
          </div>
          <Progress 
            value={uploadProgress} 
            className="w-full h-2 bg-gray-200 dark:bg-gray-700" 
          />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
            Processing your invoice files...
          </div>
        </div>
      )}
    </div>
  );
}

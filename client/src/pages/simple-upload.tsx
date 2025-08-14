import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SimpleUpload() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setResult(null);

    try {
      // Direct upload to Cloudinary - no API needed
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'ml_default'); // Use default preset
      formData.append('folder', 'Invoice-uploads');
      
      const response = await fetch('https://api.cloudinary.com/v1_1/dcpy2x17s/image/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (response.ok) {
        setResult({
          success: true,
          url: data.secure_url,
          public_id: data.public_id
        });
      } else {
        setResult({
          success: false,
          error: data.error?.message || 'Upload failed'
        });
      }
    } catch (error) {
      setResult({
        success: false,
        error: error.message
      });
    }
    
    setUploading(false);
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Simple Upload Test</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Upload Image to Cloudinary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={handleUpload}
            disabled={uploading}
            className="w-full p-2 border rounded"
          />
          
          {uploading && (
            <p className="text-blue-600">Uploading...</p>
          )}
          
          {result && (
            <div className={`p-4 rounded ${result.success ? 'bg-green-100' : 'bg-red-100'}`}>
              {result.success ? (
                <div>
                  <p className="text-green-800 font-bold">✅ Upload Successful!</p>
                  <p>Public ID: {result.public_id}</p>
                  <p>URL: <a href={result.url} target="_blank" className="text-blue-600">{result.url}</a></p>
                </div>
              ) : (
                <p className="text-red-800">❌ Error: {result.error}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
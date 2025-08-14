import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Debug() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug-upload');
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold gradient-text">Debug Logs</h1>
        <Button onClick={fetchLogs} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh Logs'}
        </Button>
      </div>

      <Card className="modern-card border-0">
        <CardHeader>
          <CardTitle>Upload Debug Information</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-muted-foreground">No logs available. Try uploading a file first.</p>
          ) : (
            <div className="space-y-4">
              {logs.map((log, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                  <div className="flex items-center justify-between mb-2">
                    <strong className="text-sm font-mono">{log.message}</strong>
                    <span className="text-xs text-muted-foreground">{log.timestamp}</span>
                  </div>
                  {log.data && (
                    <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto">
                      {log.data}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
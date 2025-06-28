import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  CheckCircle, 
  DollarSign, 
  AlertTriangle,
  Plus,
  Keyboard,
  Download,
  Eye,
  History
} from "lucide-react";
import { useDashboardStats, useInvoices } from "@/hooks/use-invoices";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: recentInvoices, isLoading: invoicesLoading } = useInvoices();

  if (statsLoading || invoicesLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "approved":
        return "default";
      case "pending_entry":
        return "secondary";
      case "pending_review":
        return "outline";
      case "admin_review":
        return "destructive";
      default:
        return "outline";
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Overview</h1>
        <p className="text-gray-600">Monitor invoice processing workflow across all queues</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats?.totalPending || 0}</p>
                <p className="text-blue-100">Total Pending</p>
              </div>
              <Clock className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats?.readyToExport || 0}</p>
                <p className="text-green-100">Ready to Export</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-yellow-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">${stats?.todaysTotal || 0}</p>
                <p className="text-yellow-100">Today's Total</p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats?.needReview || 0}</p>
                <p className="text-red-100">Need Review</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium">Invoice #</th>
                      <th className="pb-2 font-medium">Vendor</th>
                      <th className="pb-2 font-medium">Amount</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentInvoices?.slice(0, 5).map((invoice) => (
                      <tr key={invoice.id} className="border-b">
                        <td className="py-3">{invoice.invoiceNumber}</td>
                        <td className="py-3">{invoice.vendorName}</td>
                        <td className="py-3">${invoice.invoiceAmount}</td>
                        <td className="py-3">
                          <Badge variant={getStatusBadgeVariant(invoice.status)}>
                            {formatStatus(invoice.status)}
                          </Badge>
                        </td>
                        <td className="py-3 text-sm text-gray-600">
                          {new Date(invoice.updatedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {(!recentInvoices || recentInvoices.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    No invoices found. Start by uploading an invoice!
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/upload">
                <Button className="w-full justify-start" variant="default">
                  <Plus className="h-4 w-4 mr-2" />
                  Upload Invoice
                </Button>
              </Link>
              
              <Link href="/entry">
                <Button className="w-full justify-start" variant="outline">
                  <Keyboard className="h-4 w-4 mr-2" />
                  Enter Data
                </Button>
              </Link>
              
              <Link href="/export">
                <Button className="w-full justify-start" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Generate Export
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

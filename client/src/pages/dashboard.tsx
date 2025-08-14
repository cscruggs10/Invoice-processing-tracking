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
  History,
  FileText
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text">Dashboard Overview</h1>
        <p className="text-muted-foreground mt-2">Monitor invoice processing workflow across all queues</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="modern-card hover-lift gradient-subtle border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                  {stats?.totalPending || 0}
                </p>
                <p className="text-muted-foreground text-sm mt-1">Total Pending</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="mt-4 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 w-3/4 animate-pulse"></div>
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card hover-lift gradient-subtle border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">
                  {stats?.readyToExport || 0}
                </p>
                <p className="text-muted-foreground text-sm mt-1">Ready to Export</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="mt-4 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-green-400 to-green-600 w-full"></div>
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card hover-lift gradient-subtle border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-amber-700 bg-clip-text text-transparent">
                  ${stats?.todaysTotal || 0}
                </p>
                <p className="text-muted-foreground text-sm mt-1">Today's Total</p>
              </div>
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                <DollarSign className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="mt-4 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-400 to-amber-600 w-1/2"></div>
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card hover-lift gradient-subtle border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent">
                  {stats?.needReview || 0}
                </p>
                <p className="text-muted-foreground text-sm mt-1">Need Review</p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl status-glow">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <div className="mt-4 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-red-400 to-red-600 w-1/4"></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card className="modern-card border-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                <History className="h-5 w-5 text-purple-600" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 text-left">
                      <th className="pb-3 font-medium text-sm text-muted-foreground">Invoice #</th>
                      <th className="pb-3 font-medium text-sm text-muted-foreground">Vendor</th>
                      <th className="pb-3 font-medium text-sm text-muted-foreground">Amount</th>
                      <th className="pb-3 font-medium text-sm text-muted-foreground">Status</th>
                      <th className="pb-3 font-medium text-sm text-muted-foreground">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentInvoices?.slice(0, 5).map((invoice, index) => (
                      <tr 
                        key={invoice.id} 
                        className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <td className="py-4 font-medium">{invoice.invoiceNumber}</td>
                        <td className="py-4 text-sm">{invoice.vendorName}</td>
                        <td className="py-4 font-semibold text-sm">${invoice.invoiceAmount}</td>
                        <td className="py-4">
                          <Badge 
                            variant={getStatusBadgeVariant(invoice.status)}
                            className="font-medium"
                          >
                            {formatStatus(invoice.status)}
                          </Badge>
                        </td>
                        <td className="py-4 text-sm text-muted-foreground">
                          {new Date(invoice.updatedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {(!recentInvoices || recentInvoices.length === 0) && (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium mb-2">No invoices found</p>
                    <p className="text-sm">Start by uploading your first invoice!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <Card className="modern-card border-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                <Plus className="h-5 w-5 text-purple-600" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/upload">
                <Button className="w-full justify-start btn-modern gradient-primary text-white hover:shadow-lg">
                  <Plus className="h-4 w-4 mr-2" />
                  Upload Invoice
                </Button>
              </Link>
              
              <Link href="/entry">
                <Button className="w-full justify-start hover-lift" variant="outline">
                  <Keyboard className="h-4 w-4 mr-2" />
                  Enter Data
                  {stats?.pendingEntry > 0 && (
                    <Badge className="ml-auto" variant="secondary">
                      {stats.pendingEntry}
                    </Badge>
                  )}
                </Button>
              </Link>
              
              <Link href="/export">
                <Button className="w-full justify-start hover-lift" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Generate Export
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="modern-card border-0 gradient-subtle">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="h-4 w-4 text-purple-600" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Database</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">Connected</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Active Users</span>
                  <span className="text-sm font-medium">1</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Last Backup</span>
                  <span className="text-sm font-medium">2 hours ago</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

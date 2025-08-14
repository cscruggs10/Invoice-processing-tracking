import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Upload, 
  Keyboard, 
  Eye, 
  Shield, 
  CheckCircle, 
  Download, 
  Search,
  FileText,
  ClipboardCheck,
  AlertTriangle,
  Brain
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useDashboardStats, useInvoices } from "@/hooks/use-invoices";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavigationItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  getCount?: (stats: any, invoices: any) => number | null;
}

const navigationItems: NavigationItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload Invoice", icon: Upload },
  { 
    href: "/entry", 
    label: "Data Entry Queue", 
    icon: Keyboard,
    getCount: (stats, invoices) => invoices?.filter((inv: any) => inv.status === "pending_entry").length || 0
  },
  { 
    href: "/review", 
    label: "Review Queue", 
    icon: Eye,
    getCount: (stats, invoices) => invoices?.filter((inv: any) => inv.status === "pending_review").length || 0
  },
  { 
    href: "/admin", 
    label: "Admin Review", 
    icon: Shield,
    getCount: (stats) => stats?.needReview || 0
  },
  { 
    href: "/approved", 
    label: "Approved Invoices", 
    icon: CheckCircle,
    getCount: (stats) => stats?.readyToExport || 0
  },
  { href: "/export", label: "Daily Export", icon: Download },
  { 
    href: "/import-verification", 
    label: "Import Verification", 
    icon: ClipboardCheck,
    getCount: (stats, invoices) => {
      // Count export batches awaiting verification - we'll need to fetch this separately
      // For now, return null to not show a count
      return null;
    }
  },
  { 
    href: "/import-failures", 
    label: "Import Failures", 
    icon: AlertTriangle,
    getCount: (stats, invoices) => invoices?.filter((inv: any) => inv.status === "import_failed").length || 0
  },
  { href: "/search", label: "Search Filed Invoices", icon: Search },
  { href: "/debug", label: "Debug Logs", icon: Brain },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { data: stats } = useDashboardStats();
  const { data: invoices } = useInvoices();

  const handleLinkClick = () => {
    // Close sidebar on mobile after clicking a link
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "fixed top-0 left-0 h-full w-[280px] glass shadow-2xl transform transition-all duration-300 z-50 overflow-y-auto",
        "border-r border-gray-200/50 dark:border-gray-700/50",
        isOpen ? "translate-x-0" : "-translate-x-full",
        "md:translate-x-0"
      )}>
        <div className="gradient-primary text-white p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <FileText className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-bold">Invoice Tracker</h1>
          </div>
        </div>
        
        <nav className="p-4">
          <ul className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              const count = item.getCount?.(stats, invoices) ?? null;
              
              return (
                <li key={item.href} className="animate-slideInLeft">
                  <Link href={item.href}>
                    <div
                      className={cn(
                        "group flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200",
                        "hover-lift cursor-pointer",
                        isActive 
                          ? "gradient-primary text-white shadow-lg shadow-purple-500/25" 
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/50"
                      )}
                      onClick={handleLinkClick}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={cn(
                          "h-5 w-5 transition-transform duration-200",
                          isActive ? "" : "group-hover:scale-110"
                        )} />
                        <span>{item.label}</span>
                      </div>
                      {count !== null && count > 0 && (
                        <Badge 
                          variant={isActive ? "secondary" : "outline"}
                          className={cn(
                            "ml-auto transition-all duration-200",
                            isActive 
                              ? "bg-white/20 text-white border-white/30" 
                              : "group-hover:bg-purple-100 group-hover:text-purple-700 dark:group-hover:bg-purple-900/50 dark:group-hover:text-purple-300"
                          )}
                        >
                          {count}
                        </Badge>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </>
  );
}

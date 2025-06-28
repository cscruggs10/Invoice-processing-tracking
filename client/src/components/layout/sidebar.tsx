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
  FileText
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
    getCount: (stats) => stats?.totalPending || 0
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
  { href: "/search", label: "Search & Archive", icon: Search },
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
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "fixed top-0 left-0 h-full w-[280px] bg-white border-r border-gray-200 transform transition-transform duration-300 z-50 overflow-y-auto",
        isOpen ? "translate-x-0" : "-translate-x-full",
        "md:translate-x-0"
      )}>
        <div className="bg-primary text-primary-foreground p-4 border-b">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <h1 className="font-semibold">Invoice Manager</h1>
          </div>
        </div>
        
        <nav className="p-0">
          <ul className="space-y-0">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              
              return (
                <li key={item.href}>
                  <Link href={item.href}>
                    <div
                      className={cn(
                        "flex items-center justify-between px-4 py-3 text-sm border-b border-gray-100 transition-colors hover:bg-primary hover:text-primary-foreground cursor-pointer",
                        isActive && "bg-primary text-primary-foreground"
                      )}
                      onClick={handleLinkClick}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </div>
                      {item.getCount && (
                        <Badge variant={isActive ? "secondary" : "default"} className="ml-auto">
                          {item.getCount(stats, invoices)}
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

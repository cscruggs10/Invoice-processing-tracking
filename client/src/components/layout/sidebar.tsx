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

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigationItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, count: null },
  { href: "/upload", label: "Upload Invoice", icon: Upload, count: null },
  { href: "/entry", label: "Data Entry Queue", icon: Keyboard, count: 8 },
  { href: "/review", label: "Review Queue", icon: Eye, count: 12 },
  { href: "/admin", label: "Admin Review", icon: Shield, count: 3 },
  { href: "/approved", label: "Approved Invoices", icon: CheckCircle, count: 24 },
  { href: "/export", label: "Daily Export", icon: Download, count: null },
  { href: "/search", label: "Search & Archive", icon: Search, count: null },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [location] = useLocation();

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
                    <a
                      className={cn(
                        "flex items-center justify-between px-4 py-3 text-sm border-b border-gray-100 transition-colors hover:bg-primary hover:text-primary-foreground",
                        isActive && "bg-primary text-primary-foreground"
                      )}
                      onClick={handleLinkClick}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </div>
                      {item.count && (
                        <Badge variant={isActive ? "secondary" : "default"} className="ml-auto">
                          {item.count}
                        </Badge>
                      )}
                    </a>
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

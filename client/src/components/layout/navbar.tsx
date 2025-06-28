import { Button } from "@/components/ui/button";
import { Menu, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavbarProps {
  onToggleSidebar: () => void;
}

export function Navbar({ onToggleSidebar }: NavbarProps) {
  return (
    <nav className="bg-white border-b border-gray-200 h-[60px] flex items-center px-4">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="md:hidden"
            onClick={onToggleSidebar}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">Invoice Management System</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 hidden sm:inline">
            Welcome, Admin User
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Profile Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}

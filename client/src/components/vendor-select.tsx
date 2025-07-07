import { useState, useEffect } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery } from "@tanstack/react-query";

interface Vendor {
  id: number;
  vendorNumber: string;
  vendorName: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  isActive: boolean;
}

interface VendorSelectProps {
  value?: string; // vendor number
  onSelect: (vendorNumber: string, vendorName: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function VendorSelect({ value, onSelect, placeholder = "Select vendor...", disabled }: VendorSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["/api/vendors", { search, active: true }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      params.append("active", "true");
      
      const response = await fetch(`/api/vendors?${params}`);
      if (!response.ok) throw new Error("Failed to fetch vendors");
      return response.json() as Vendor[];
    },
  });

  const selectedVendor = vendors.find(v => v.vendorNumber === value);

  const handleSelect = (vendor: Vendor) => {
    onSelect(vendor.vendorNumber, vendor.vendorName);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedVendor ? (
            <div className="flex flex-col items-start max-w-full">
              <span className="font-medium truncate">{selectedVendor.vendorName}</span>
              <span className="text-xs text-muted-foreground">#{selectedVendor.vendorNumber}</span>
            </div>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput 
            placeholder="Search vendors..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? "Loading vendors..." : "No vendors found."}
            </CommandEmpty>
            <CommandGroup>
              {vendors.map((vendor) => (
                <CommandItem
                  key={vendor.id}
                  value={`${vendor.vendorName} ${vendor.vendorNumber}`}
                  onSelect={() => handleSelect(vendor)}
                  className="flex items-center justify-between"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{vendor.vendorName}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>#{vendor.vendorNumber}</span>
                      {vendor.city && vendor.state && (
                        <span>• {vendor.city}, {vendor.state}</span>
                      )}
                      {vendor.phone && (
                        <span>• {vendor.phone}</span>
                      )}
                    </div>
                  </div>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      value === vendor.vendorNumber ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
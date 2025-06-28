import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { VinLookupResult } from "@/lib/types";

export function useVinLookup(vin: string) {
  return useQuery<VinLookupResult>({
    queryKey: ['/api/vin-lookup', vin],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/vin-lookup/${vin}`);
      return response.json();
    },
    enabled: vin.length === 8, // Only lookup when we have 8 digits
  });
}

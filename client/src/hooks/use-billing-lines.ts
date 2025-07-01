import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { BillingLine, InsertBillingLine } from "@shared/schema";

export function useBillingLines(invoiceId: number) {
  return useQuery({
    queryKey: ['/api/invoices', invoiceId, 'billing-lines'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/invoices/${invoiceId}/billing-lines`);
      return response.json() as Promise<BillingLine[]>;
    },
  });
}

export function useCreateBillingLine() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (billingLineData: InsertBillingLine) => {
      const response = await apiRequest('POST', '/api/billing-lines', billingLineData);
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/invoices', variables.invoiceId, 'billing-lines'] 
      });
    },
  });
}

export function useUpdateBillingLine() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<BillingLine> }) => {
      const response = await apiRequest('PATCH', `/api/billing-lines/${id}`, updates);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/invoices', data.invoiceId, 'billing-lines'] 
      });
    },
  });
}

export function useDeleteBillingLine() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, invoiceId }: { id: number; invoiceId: number }) => {
      const response = await apiRequest('DELETE', `/api/billing-lines/${id}`);
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/invoices', variables.invoiceId, 'billing-lines'] 
      });
    },
  });
}
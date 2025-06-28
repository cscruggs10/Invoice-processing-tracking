import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Invoice, InsertInvoice } from "@shared/schema";
import type { InvoiceStatus } from "@/lib/types";

export function useInvoices(filters?: {
  status?: InvoiceStatus[];
  userId?: number;
  startDate?: Date;
  endDate?: Date;
  vendorName?: string;
  invoiceNumber?: string;
  vin?: string;
}) {
  const queryParams = new URLSearchParams();
  
  if (filters?.status) queryParams.set('status', filters.status.join(','));
  if (filters?.userId) queryParams.set('userId', filters.userId.toString());
  if (filters?.startDate) queryParams.set('startDate', filters.startDate.toISOString());
  if (filters?.endDate) queryParams.set('endDate', filters.endDate.toISOString());
  if (filters?.vendorName) queryParams.set('vendorName', filters.vendorName);
  if (filters?.invoiceNumber) queryParams.set('invoiceNumber', filters.invoiceNumber);
  if (filters?.vin) queryParams.set('vin', filters.vin);
  
  const queryString = queryParams.toString();
  const url = `/api/invoices${queryString ? `?${queryString}` : ''}`;
  
  return useQuery<Invoice[]>({
    queryKey: ['/api/invoices', filters],
    queryFn: async () => {
      const response = await apiRequest('GET', url);
      return response.json();
    },
  });
}

export function useInvoice(id: number) {
  return useQuery<Invoice>({
    queryKey: ['/api/invoices', id],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/invoices/${id}`);
      return response.json();
    },
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (invoiceData: InsertInvoice) => {
      const response = await apiRequest('POST', '/api/invoices', invoiceData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
    },
  });
}

export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status, userId }: { id: number; status: InvoiceStatus; userId: number }) => {
      const response = await apiRequest('PATCH', `/api/invoices/${id}/status`, { status, userId });
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Invoice> }) => {
      const response = await apiRequest('PATCH', `/api/invoices/${id}`, updates);
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', variables.id] });
    },
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/dashboard/stats');
      return response.json();
    },
  });
}

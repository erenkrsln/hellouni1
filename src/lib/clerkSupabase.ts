import { useAuth } from "@clerk/clerk-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface ProxyRequest {
  operation: 'select' | 'insert' | 'update' | 'delete' | 'rpc';
  table: string;
  data?: any;
  filters?: Record<string, any>;
  select?: string;
}

export const useClerkSupabaseProxy = () => {
  const { getToken } = useAuth();

  const executeQuery = async (request: ProxyRequest) => {
    const token = await getToken();
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/clerk-proxy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Query failed');
    }

    return response.json();
  };

  return {
    from: (table: string) => ({
      select: async (columns = '*') => {
        return executeQuery({ operation: 'select', table, select: columns });
      },
      insert: async (data: any) => {
        return executeQuery({ operation: 'insert', table, data });
      },
      update: async (data: any, filters?: Record<string, any>) => {
        return executeQuery({ operation: 'update', table, data, filters });
      },
      delete: async (filters: Record<string, any>) => {
        return executeQuery({ operation: 'delete', table, filters });
      },
    }),
    rpc: async (function_name: string, params: any) => {
      return executeQuery({ 
        operation: 'rpc', 
        table: '', 
        data: { function_name, params } 
      });
    },
  };
};

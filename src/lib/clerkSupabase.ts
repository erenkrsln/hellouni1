import { useAuth } from "@clerk/clerk-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface ProxyRequest {
  operation: 'select' | 'insert' | 'update' | 'delete' | 'rpc';
  table: string;
  data?: any;
  filters?: Record<string, any>;
  select?: string;
  order?: { column: string; ascending?: boolean };
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

    const result = await response.json();
    return result.data;
  };

  return {
    from: (table: string) => ({
      select: async (columns = '*', order?: { column: string; ascending?: boolean }, filters?: Record<string, any>) => {
        const result = await executeQuery({ 
          operation: 'select', 
          table, 
          select: columns,
          order,
          filters 
        });
        return { data: result };
      },
      insert: async (data: any) => {
        const result = await executeQuery({ operation: 'insert', table, data });
        return { data: result };
      },
      update: async (data: any, filters?: Record<string, any>) => {
        const result = await executeQuery({ operation: 'update', table, data, filters });
        return { data: result };
      },
      delete: async (filters: Record<string, any>) => {
        const result = await executeQuery({ operation: 'delete', table, filters });
        return { data: result };
      },
    }),
    rpc: async (function_name: string, params: any) => {
      const result = await executeQuery({ 
        operation: 'rpc', 
        table: '', 
        data: { function_name, params } 
      });
      return { data: result };
    },
  };
};

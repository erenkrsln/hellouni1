import { useAuth } from '@clerk/clerk-react';
import { supabase } from '@/integrations/supabase/client';

export async function callEdgeFunction(
  functionName: string,
  payload: any,
  getToken: () => Promise<string | null>
) {
  const token = await getToken();
  
  if (!token) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase.functions.invoke(functionName, {
    body: payload,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (error) {
    throw error;
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}

// Hook to get Clerk token for edge functions
export function useEdgeFunctionAuth() {
  const { getToken } = useAuth();
  
  return {
    callEdgeFunction: (functionName: string, payload: any) =>
      callEdgeFunction(functionName, payload, getToken),
  };
}

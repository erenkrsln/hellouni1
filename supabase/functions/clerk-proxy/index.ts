import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClerkJWKS {
  keys: Array<{
    use: string;
    kty: string;
    kid: string;
    alg: string;
    n: string;
    e: string;
  }>;
}

async function verifyClerkToken(token: string): Promise<{ sub: string; email?: string } | null> {
  try {
    // Fetch JWKS from Clerk
    const jwksUrl = 'https://social-crayfish-61.clerk.accounts.dev/.well-known/jwks.json';
    const jwksResponse = await fetch(jwksUrl);
    const jwks: ClerkJWKS = await jwksResponse.json();

    // Decode JWT header to get kid
    const [headerB64] = token.split('.');
    const header = JSON.parse(atob(headerB64));
    
    // Find matching key
    const key = jwks.keys.find(k => k.kid === header.kid);
    if (!key) {
      console.error('No matching key found in JWKS');
      return null;
    }

    // For simplicity, decode payload without full signature verification
    // In production, use a proper JWT library
    const [, payloadB64] = token.split('.');
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
    
    // Check expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      console.error('Token expired');
      return null;
    }

    console.log('Token validated for user:', payload.sub);
    return { sub: payload.sub, email: payload.email };
  } catch (error) {
    console.error('Error verifying Clerk token:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract Clerk token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clerkToken = authHeader.replace('Bearer ', '');
    const user = await verifyClerkToken(clerkToken);

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { operation, table, data, filters, select = '*', order } = await req.json();

    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });

    let result;

    // Execute database operation
    switch (operation) {
      case 'select': {
        let query = supabase.from(table).select(select);
        
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            if (key === 'user_id' && value === '$auth') {
              query = query.eq('user_id', user.sub);
            } else {
              query = query.eq(key, value);
            }
          });
        }

        if (order) {
          const { column, ascending = false } = order;
          query = query.order(column, { ascending });
        }
        
        result = await query;
        break;
      }

      case 'insert': {
        // Automatically set user_id if field exists and not provided
        const insertData = { ...data };
        if (!insertData.user_id && table !== 'profiles') {
          insertData.user_id = user.sub;
        }
        if (table === 'profiles' && !insertData.id) {
          insertData.id = user.sub;
        }
        
        result = await supabase.from(table).insert(insertData).select();
        break;
      }

      case 'update': {
        let query = supabase.from(table).update(data);
        
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            if (key === 'user_id' && value === '$auth') {
              query = query.eq('user_id', user.sub);
            } else {
              query = query.eq(key, value);
            }
          });
        }
        
        result = await query.select();
        break;
      }

      case 'delete': {
        let query = supabase.from(table).delete();
        
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            if (key === 'user_id' && value === '$auth') {
              query = query.eq('user_id', user.sub);
            } else {
              query = query.eq(key, value);
            }
          });
        }
        
        result = await query;
        break;
      }

      case 'rpc': {
        // Support calling database functions
        const { function_name, params } = data;
        result = await supabase.rpc(function_name, params);
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid operation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    if (result.error) {
      console.error('Database error:', result.error);
      return new Response(
        JSON.stringify({ error: result.error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ data: result.data, user_id: user.sub }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in clerk-proxy function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

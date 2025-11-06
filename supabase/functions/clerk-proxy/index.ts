import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { create, verify } from "https://deno.land/x/djwt@v3.0.1/mod.ts";
import { decode } from "https://deno.land/std@0.208.0/encoding/base64url.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const JWKS_CACHE = new Map<string, CryptoKey>();
const JWKS_URL = 'https://social-crayfish-61.clerk.accounts.dev/.well-known/jwks.json';

interface JWKS {
  keys: Array<{
    kty: string;
    use: string;
    kid: string;
    n: string;
    e: string;
    alg: string;
  }>;
}

function base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const paddedBase64 = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  const binaryString = atob(paddedBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

async function importJWK(jwk: { n: string; e: string; kty: string; alg: string }): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'jwk',
    {
      kty: jwk.kty,
      n: jwk.n,
      e: jwk.e,
      alg: jwk.alg,
      ext: true,
    },
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['verify']
  );
}

async function getPublicKey(kid: string): Promise<CryptoKey | null> {
  if (JWKS_CACHE.has(kid)) {
    return JWKS_CACHE.get(kid)!;
  }

  try {
    const response = await fetch(JWKS_URL);
    const jwks: JWKS = await response.json();
    
    const jwk = jwks.keys.find(key => key.kid === kid);
    if (!jwk) {
      console.error('Key not found in JWKS:', kid);
      return null;
    }

    const publicKey = await importJWK(jwk);
    JWKS_CACHE.set(kid, publicKey);
    return publicKey;
  } catch (error) {
    console.error('Error fetching JWKS:', error);
    return null;
  }
}

async function verifyClerkToken(token: string): Promise<{ sub: string; email?: string } | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('Invalid JWT format');
      return null;
    }

    // Decode header to get kid
    const headerJson = new TextDecoder().decode(base64UrlToArrayBuffer(parts[0]));
    const header = JSON.parse(headerJson);
    
    if (!header.kid) {
      console.error('No kid in JWT header');
      return null;
    }

    // Get public key
    const publicKey = await getPublicKey(header.kid);
    if (!publicKey) {
      return null;
    }

    // Verify signature
    const signatureData = parts[0] + '.' + parts[1];
    const signature = base64UrlToArrayBuffer(parts[2]);
    const dataBuffer = new TextEncoder().encode(signatureData);

    const isValid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      publicKey,
      signature,
      dataBuffer
    );

    if (!isValid) {
      console.error('JWT signature verification failed');
      return null;
    }

    // Decode and validate payload
    const payloadJson = new TextDecoder().decode(base64UrlToArrayBuffer(parts[1]));
    const payload = JSON.parse(payloadJson);

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
        // Automatically set user_id/sender_id if field exists and not provided
        const insertData = { ...data };
        
        // Handle messages table (uses sender_id)
        if (table === 'messages' && !insertData.sender_id) {
          insertData.sender_id = user.sub;
        }
        // Handle profiles table (uses id)
        else if (table === 'profiles' && !insertData.id) {
          insertData.id = user.sub;
        }
        // Handle other tables (use user_id)
        else if (!insertData.user_id && table !== 'profiles' && table !== 'messages') {
          insertData.user_id = user.sub;
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

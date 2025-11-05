import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function verifyClerkToken(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)
  const clerkSecretKey = Deno.env.get('CLERK_SECRET_KEY')

  try {
    const response = await fetch('https://api.clerk.com/v1/tokens/verify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${clerkSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    })

    if (!response.ok) {
      console.error('Clerk verification failed:', await response.text())
      return null
    }

    const data = await response.json()
    return data.sub || null
  } catch (error) {
    console.error('Error verifying Clerk token:', error)
    return null
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const userId = await verifyClerkToken(req.headers.get('Authorization'))
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { action, otherUserId, groupName, participantIds } = await req.json()

    if (action === 'GET_OR_CREATE_DM') {
      // Find existing conversation
      const { data: existingConv } = await supabase.rpc('get_or_create_conversation', {
        current_user_id: userId,
        other_user_id: otherUserId,
      })

      return new Response(JSON.stringify({ conversationId: existingConv }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'CREATE_GROUP') {
      if (!groupName || !groupName.trim()) {
        return new Response(JSON.stringify({ error: 'Group name required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (!participantIds || participantIds.length < 2) {
        return new Response(JSON.stringify({ error: 'At least 2 participants required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: conversationId, error } = await supabase.rpc('create_group_conversation', {
        current_user_id: userId,
        group_name: groupName.trim(),
        participant_ids: participantIds,
      })

      if (error) throw error

      return new Response(JSON.stringify({ conversationId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Error in conversations function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

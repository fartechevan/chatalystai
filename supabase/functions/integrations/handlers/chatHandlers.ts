
import { corsHeaders } from "../../_shared/cors.ts";
import { EVO_API_BASE_URL, getEvolutionAPIOptions } from "../../_shared/evolution-api.ts";

// Handle finding chats for an instance
export async function handleFindChats(req: Request) {
  try {
    // Get instanceId from request body
    const body = req.method === 'POST' ? await req.json() : null;
    const url = new URL(req.url);
    const instanceId = body?.instanceId || url.searchParams.get('instanceId');
    
    if (!instanceId) {
      return new Response(
        JSON.stringify({ error: 'Instance ID is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    console.log(`Finding chats for instance: ${instanceId}`);
    
    // Set up the request to Evolution API
    const apiUrl = `${EVO_API_BASE_URL}/chat/findChats/${instanceId}`;
    const options = getEvolutionAPIOptions();
    
    console.log(`Sending request to: ${apiUrl}`);
    
    // Send request to Evolution API
    const response = await fetch(apiUrl, options);
    
    if (!response.ok) {
      console.error(`Error response from Evolution API: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`Error details: ${errorText}`);
      return new Response(
        JSON.stringify({ error: `Failed to fetch chats: ${response.statusText}` }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Parse the response
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error(`Unexpected response format: ${text}`);
      return new Response(
        JSON.stringify({ error: 'Invalid response format from Evolution API' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    const data = await response.json();
    console.log(`Found ${data.length} chats`);
    
    return new Response(
      JSON.stringify(data),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in handleFindChats:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}

// Handle finding messages for a specific chat
export async function handleFindMessages(req: Request) {
  try {
    // Get parameters from request
    const body = req.method === 'POST' ? await req.json() : null;
    const url = new URL(req.url);
    const instanceId = body?.instanceId || url.searchParams.get('instanceId');
    const chatId = body?.chatId || url.searchParams.get('chatId');
    
    if (!instanceId) {
      return new Response(
        JSON.stringify({ error: 'Instance ID is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    console.log(`Finding messages for instance: ${instanceId}, chat: ${chatId || 'all'}`);
    
    // Set up the request to Evolution API
    let apiUrl = `${EVO_API_BASE_URL}/chat/findMessages/${instanceId}`;
    if (chatId) {
      apiUrl += `/${chatId}`;
    }
    
    const options = getEvolutionAPIOptions();
    
    console.log(`Sending request to: ${apiUrl}`);
    
    // Send request to Evolution API
    const response = await fetch(apiUrl, options);
    
    if (!response.ok) {
      console.error(`Error response from Evolution API: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`Error details: ${errorText}`);
      return new Response(
        JSON.stringify({ error: `Failed to fetch messages: ${response.statusText}` }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Parse the response
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error(`Unexpected response format: ${text}`);
      return new Response(
        JSON.stringify({ error: 'Invalid response format from Evolution API' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    const data = await response.json();
    console.log(`Found ${chatId ? data.messages?.length || 0 : data.length} messages`);
    
    return new Response(
      JSON.stringify(data),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in handleFindMessages:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}

import { supabase } from "@/integrations/supabase/client"; 

async function fetchInstances() {
  console.log("Fetching instances via Supabase function 'fetch-whatsapp-instances'...");

  try {
    // 1. Invoke the Supabase function
    const { data, error } = await supabase.functions.invoke('fetch-whatsapp-instances');

    // 2. Handle errors from the function invocation itself
    if (error) {
      console.error('Error invoking fetch-whatsapp-instances function:', error);
      // Return an error object compatible with how the component expects errors
      return { error: `Failed to invoke Supabase function: ${error.message}` };
    }

    // 3. Check for errors returned *within* the function's response data
    //    (e.g., if the function couldn't reach Evolution API or had config issues)
    if (data && data.error) {
        console.error('Error returned from fetch-whatsapp-instances function:', data.error);
        return { error: `Server-side error: ${data.error}` };
    }

    // 4. Validate the structure - it should be an array (or handle the case where it's not)
    if (Array.isArray(data)) {
      console.log("Successfully fetched instances array via Supabase function:", data);
      return data; // Return the array of instances
    } else {
      // This case might indicate an unexpected successful response format from the function
      console.error('Unexpected response format from Supabase function. Expected an array:', data);
      return { error: 'Unexpected response format received from server (expected array).' };
    }

  } catch (error) {
    // Catch unexpected errors during the invocation process
    console.error('Error during fetchInstances service call (invoking Supabase function):', error);
    const errorMessage = (error instanceof Error) ? error.message : 'An unknown error occurred';
    return { error: `Internal error during Supabase function invocation: ${errorMessage}` };
  }
}

// Ensure the function is exported as default
export default fetchInstances;

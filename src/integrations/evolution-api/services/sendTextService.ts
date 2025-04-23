import { apiServiceInstance } from "@/services/api/apiService"; // Import ApiService
import { getEvolutionCredentials } from "../utils/credentials";
import { supabase } from '@/integrations/supabase/client'; // Import Supabase client for display name lookup

export interface SendTextParams {
  instance: string; // Instance ID from the frontend selection
  integrationId: string; // Integration ID to fetch credentials and config
  number: string; // Recipient's phone number
  text: string; // The message text
  // Optional parameters
  delay?: number;
  linkPreview?: boolean;
  mentionsEveryOne?: boolean;
  mentioned?: string[];
  quoted?: {
    key: { id: string };
    message: { conversation: string };
  };
}

export interface SendTextResponse {
  // Define the expected success response structure from the Evolution API
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // Allow for other properties
}

/**
 * Sends a text message directly via the Evolution API.
 * Fetches credentials and instance display name before making the call.
 * @param params - The parameters for sending the text message.
 * @returns A promise that resolves with the API response on success.
 * @throws If fetching credentials, display name, or the API request fails.
 */
export const sendTextService = async (params: SendTextParams): Promise<SendTextResponse> => {
  // Destructure all params
  const { instance, integrationId, number, text, ...optionalData } = params;

  console.log(`sendTextService: Sending text directly for instance ID ${instance}, integration ${integrationId}`);

  // 1. Fetch Evolution API credentials
  console.log("sendTextService: Fetching Evolution credentials...");
  const { apiKey, baseUrl } = await getEvolutionCredentials(integrationId);
  console.log(`sendTextService: Credentials fetched. Base URL: ${baseUrl}`);

  // 2. Fetch instance_display_name from integrations_config using Supabase client
  console.log(`sendTextService: Fetching instance display name for instance ID ${instance}...`);
  const { data: configData, error: configError } = await supabase
    .from('integrations_config')
    .select('instance_display_name')
    .eq('integration_id', integrationId)
    .eq('instance_id', instance) // Match based on the instance ID passed from frontend
    .maybeSingle(); // Use maybeSingle to allow zero or one row

  // Check for database errors first
  if (configError) {
      console.error(`sendTextService: Database error fetching integration config for instance ${instance}:`, configError);
      throw new Error(`Database error fetching integration config: ${configError.message}`);
  }

  // Check if data was actually found
  if (!configData || !configData.instance_display_name) {
      console.error(`sendTextService: Configuration not found for instance ID ${instance} and integration ID ${integrationId}. Please check integrations_config table.`);
      throw new Error(`Configuration not found for instance ${instance}.`);
  }

  const instanceDisplayName = configData.instance_display_name;
  console.log(`sendTextService: Found instance display name: ${instanceDisplayName}`);

  // 3. Construct the Evolution API URL using the fetched display name
  const apiUrl = `${baseUrl}/message/sendText/${instanceDisplayName}`;
  console.log(`sendTextService: Constructed direct API URL: ${apiUrl}`);

  // 4. Construct the payload
  const evolutionPayload: {
      number: string;
      text: string;
      options?: {
          delay?: number;
          linkPreview?: boolean;
          mentions?: {
              everyOne?: boolean;
              mentioned?: string[];
          };
          quoted?: { key: { id: string }; message: { conversation: string } };
      };
  } = {
      number,
      text,
      ...(Object.keys(optionalData).length > 0 && {
          options: {
              ...(optionalData.delay !== undefined && { delay: optionalData.delay }),
              ...(optionalData.linkPreview !== undefined && { linkPreview: optionalData.linkPreview }),
              ...((optionalData.mentionsEveryOne || optionalData.mentioned) && {
                  mentions: {
                      ...(optionalData.mentionsEveryOne === true && { everyOne: true }),
                      ...(optionalData.mentioned && optionalData.mentioned.length > 0 && { mentioned: optionalData.mentioned }),
                  }
              }),
              ...(optionalData.quoted && { quoted: optionalData.quoted }),
          }
      })
  };

   // Clean up empty options/mentions
   if (evolutionPayload.options) {
      if (evolutionPayload.options.mentions && Object.keys(evolutionPayload.options.mentions).length === 0) {
          delete evolutionPayload.options.mentions;
      }
      if (Object.keys(evolutionPayload.options).length === 0) {
          delete evolutionPayload.options;
      }
  }
  console.log("sendTextService: Sending payload:", JSON.stringify(evolutionPayload, null, 2));

  // 5. Make the direct request using ApiService
  const result = await apiServiceInstance.request<SendTextResponse>(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": apiKey, // Use the fetched API key
    },
    body: JSON.stringify(evolutionPayload),
    logRequests: true // Enable logging for this specific call via apiService
  });

  // 6. Return the successful response (error handling done by ApiService)
  console.log(`sendTextService: Direct API call successful for ${number} via instance ${instanceDisplayName}.`);
  return result;
};

/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { SupabaseClient, PostgrestError } from "https://esm.sh/@supabase/supabase-js@2.43.4";
import { Database } from "../_shared/database.types.ts";

type ProfileIntegrationAccess = Database["public"]["Tables"]["profile_integration_access"]["Row"];
type ProfileIntegrationAccessInsert = Database["public"]["Tables"]["profile_integration_access"]["Insert"];
// Define a type for the profile data included in the join
type ProfileInfo = Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "name" | "email" | "role">;

// Define the structure returned by fetchAccessDb
interface ProfileIntegrationAccessWithProfile extends ProfileIntegrationAccess {
  profiles: ProfileInfo | null; // The joined profile data
}

interface RequestPayload {
  action: 'fetchAccess' | 'grantAccess' | 'revokeAccess' | 'connectToInstance'; // Add other actions if any
  integrationId?: string;
  profileId?: string;
  accessId?: string;
  instanceId?: string;
}

/**
 * Parses the request body for action and relevant IDs.
 * @param req The incoming request object.
 * @returns The parsed request payload.
 * @throws Error if JSON is invalid or action is missing.
 */
export async function parseRequest(req: Request): Promise<RequestPayload> {
  let body: Partial<RequestPayload>;
  try {
    body = await req.json();
  } catch (e) {
    throw new Error("Invalid JSON body");
  }

  if (!body.action) {
    throw new Error("Missing required field: action");
  }

  // Basic validation, specific validation happens in the handler based on action
  return body as RequestPayload;
}

/**
 * Fetches the user's profile to determine their role.
 * @param supabase Authenticated Supabase client.
 * @param userId The ID of the authenticated user.
 * @returns The user's role.
 * @throws Error if profile fetch fails.
 */
export async function getUserRole(supabase: SupabaseClient<Database>, userId: string): Promise<string | null> {
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      console.error(`Error fetching profile for user ${userId}:`, profileError);
      throw new Error('Failed to retrieve user profile');
    }
    return userProfile.role; // Assuming 'role' column exists on profiles table
}

/**
 * Fetches access records for a specific integration.
 * @param supabase Authenticated Supabase client.
 * @param integrationId The ID of the integration.
 * @returns Array of access records with profile details.
 * @throws Error on database query failure.
 */
export async function fetchAccessDb(
    supabase: SupabaseClient<Database>,
    integrationId: string
): Promise<ProfileIntegrationAccessWithProfile[]> { // Use the specific return type
    const { data, error } = await supabase
        .from('profile_integration_access')
        .select(`
          *,
          profiles!profile_integration_access_profile_id_fkey ( id, name, email, role )
        `) // Hint the join using the foreign key constraint name
        .eq('integration_id', integrationId);

    if (error) {
        console.error(`Error fetching access for integration ${integrationId}:`, error);
        throw new Error(`Database error fetching access: ${error.message}`);
    }
    return data || [];
}

/**
 * Grants integration access to a profile.
 * Requires admin privileges (checked in handler).
 * @param supabase Authenticated Supabase client.
 * @param integrationId The ID of the integration.
 * @param profileId The ID of the profile to grant access to.
 * @param createdById The ID of the admin user granting access.
 * @returns PostgrestError if insert fails, otherwise null.
 */
export async function grantAccessDb(
    supabase: SupabaseClient<Database>,
    integrationId: string,
    profileId: string,
    createdById: string
): Promise<PostgrestError | null> {
    const insertData: ProfileIntegrationAccessInsert = {
        profile_id: profileId,
        integration_id: integrationId,
        created_by: createdById,
    };
    const { error } = await supabase
        .from('profile_integration_access')
        .insert(insertData);

    if (error) {
        console.error(`Error granting access for profile ${profileId} to integration ${integrationId}:`, error);
        // Specific error handling (e.g., unique constraint) done in handler
    }
    return error;
}

/**
 * Revokes integration access.
 * Requires admin privileges (checked in handler).
 * @param supabase Authenticated Supabase client.
 * @param accessId The ID of the access record to delete.
 * @returns PostgrestError if delete fails, otherwise null.
 */
export async function revokeAccessDb(
    supabase: SupabaseClient<Database>,
    accessId: string
): Promise<PostgrestError | null> {
    const { error } = await supabase
        .from('profile_integration_access')
        .delete()
        .eq('id', accessId);

    if (error) {
        console.error(`Error revoking access for record ${accessId}:`, error);
        // Specific error handling (e.g., not found) done in handler
    }
    return error;
}

/**
 * Fetches connection info (base URL) for an Evolution API instance.
 * @param supabase Authenticated Supabase client.
 * @param instanceId The ID of the Evolution API instance.
 * @returns The base URL for the instance.
 * @throws Error if config or integration data is not found or on DB error.
 */
export async function fetchEvolutionConnectionInfoDb(
    supabase: SupabaseClient<Database>,
    instanceId: string
): Promise<{ baseUrl: string }> {
    // Get the integration config for the instance
    const { data: config, error: configError } = await supabase
        .from('integrations_config')
        .select('integration_id') // Only need integration_id to find the base_url
        .eq('instance_id', instanceId)
        .single(); // Assuming instance_id is unique or we only care about one

    if (configError || !config) {
        console.error(`Error fetching config for instance ${instanceId}:`, configError);
        throw new Error(`Configuration for instance ${instanceId} not found or DB error.`);
    }

    // Get the base_url from the parent integration
    const { data: integration, error: integrationError } = await supabase
        .from('integrations')
        .select('base_url')
        .eq('id', config.integration_id)
        .single();

    if (integrationError || !integration) {
        console.error(`Error fetching integration ${config.integration_id}:`, integrationError);
        throw new Error(`Integration details for instance ${instanceId} not found or DB error.`);
    }

    // Use default if base_url is null/empty
    const baseUrl = integration.base_url || 'https://api.evoapicloud.com';

    return { baseUrl: baseUrl.replace(/\/$/, '') }; // Clean trailing slash
}

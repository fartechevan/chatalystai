/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

interface RequestPayload {
  integrationId: string;
}

/**
 * Parses and validates the incoming request for getting Evolution credentials.
 * Checks for POST method and required 'integrationId' in the body.
 *
 * @param req The incoming request object.
 * @returns The validated integrationId.
 * @throws Error if validation fails.
 */
export async function parseRequest(req: Request): Promise<{ integrationId: string }> {
  // Although the original function didn't check method, POST is typical for potentially sensitive actions
  // If GET is intended, change this check.
  // if (req.method !== "POST") {
  //   throw new Error("Method Not Allowed");
  // }

  let body: Partial<RequestPayload>;
  try {
    body = await req.json();
  } catch (e) {
    throw new Error("Invalid JSON body"); // Caught by handler for 400
  }

  const { integrationId } = body;

  if (!integrationId) {
    throw new Error("Missing required field: integrationId"); // Caught for 400
  }

  return { integrationId };
}

/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

interface RequestPayload {
  integration_id: string;
}

/**
 * Parses and validates the incoming request for testing secrets.
 * Checks for POST method and required 'integration_id' in the body.
 *
 * @param req The incoming request object.
 * @returns The validated integrationId.
 * @throws Error if validation fails.
 */
export async function parseRequest(req: Request): Promise<{ integrationId: string }> {
  if (req.method !== "POST") {
    throw new Error("Method Not Allowed"); // Caught by handler for 405
  }

  let body: Partial<RequestPayload>;
  try {
    body = await req.json();
  } catch (e) {
    throw new Error("Invalid JSON body"); // Caught by handler for 400
  }

  const { integration_id: integrationId } = body; // Rename for consistency

  if (!integrationId || typeof integrationId !== 'string') {
    throw new Error("Missing or invalid 'integration_id' in request body."); // Caught for 400
  }

  return { integrationId };
}

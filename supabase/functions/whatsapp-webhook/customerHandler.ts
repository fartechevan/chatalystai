import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"

/**
 * Finds an existing customer or creates a new one
 */
export async function findOrCreateCustomer(supabaseClient: SupabaseClient, phoneNumber: string, contactName: string): Promise<string | null> {
  console.log(`Finding or creating customer with phone: ${phoneNumber}`);
  
  // Try to find existing customer
  const { data: existingCustomer, error: customerError } = await supabaseClient
    .from('customers')
    .select('id')
    .eq('phone_number', phoneNumber)
    .maybeSingle();
  
  if (customerError) {
    console.error('Error finding existing customer:', customerError);
    return null;
  }
  
  // If customer exists, return their ID
  if (existingCustomer) {
    console.log(`Found existing customer with ID: ${existingCustomer.id}`);
    return existingCustomer.id;
  }
  
  // Otherwise create new customer
  console.log(`Creating new customer with phone: ${phoneNumber}, name: ${contactName}`);
  
  const { data: newCustomer, error: createCustomerError } = await supabaseClient
    .from('customers')
    .insert({
      phone_number: phoneNumber,
      name: contactName || phoneNumber, // Use contactName if available, otherwise phone number
    })
    .select()
    .single();
  
  if (createCustomerError) {
    console.error('Error creating new customer:', createCustomerError);
    return null;
  }
  
  console.log(`Created new customer with ID: ${newCustomer.id}`);
  return newCustomer.id;
}

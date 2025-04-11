import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Finds an existing customer or creates a new one
 */
export async function findOrCreateCustomer(supabaseClient: SupabaseClient, phoneNumber: string, contactName: string, fromMe: boolean): Promise<string | null> {
  console.log(`Finding or creating customer with phone: ${phoneNumber}, contactName: ${contactName}, fromMe: ${fromMe}`);

  // Use the phone number as provided
  const formattedPhoneNumber = phoneNumber;
  
  // Try to find existing customer
  const { data: existingCustomer, error: customerError } = await supabaseClient
    .from('customers')
    .select('id, name')
    .eq('phone_number', formattedPhoneNumber)
    .maybeSingle();
  
  if (customerError) {
    console.error('Error finding existing customer:', customerError);
    return null;
  }
  
  // If customer exists
  if (existingCustomer) {
    console.log(`Found existing customer with ID: ${existingCustomer.id}`);
    
    // Only update name if message is from customer (not from Me) AND we have a contact name AND 
    // either the existing customer has no name or the name is the phone number
    if (!fromMe && contactName && 
        (!existingCustomer.name || existingCustomer.name === formattedPhoneNumber)) {
      console.log(`Updating existing customer name from ${existingCustomer.name} to ${contactName}`);
      await supabaseClient
        .from('customers')
        .update({ name: contactName })
        .eq('id', existingCustomer.id);
    }
    
    return existingCustomer.id;
  }
  
  // Otherwise create new customer
  console.log(`Creating new customer with phone: ${formattedPhoneNumber}`);
  
  // When creating a new customer, only use the contactName if the message is from the customer
  const customerName = !fromMe && contactName ? contactName : "";
  
  const { data: newCustomer, error: createCustomerError } = await supabaseClient
    .from('customers')
    .insert({
      phone_number: formattedPhoneNumber,
      name: customerName, // Only set name if message is from customer
    })
    .select()
    .single();
  
  if (createCustomerError) {
    console.error('Error creating new customer:', createCustomerError);
    return null;
  }
  
  console.log(`Created new customer with ID: ${newCustomer.id}`);
  const customerId = newCustomer.id;
  console.log(`Returning customerId: ${customerId}`);
  return customerId;
}

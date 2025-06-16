
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Finds an existing customer or creates a new one
 */
export async function findOrCreateCustomer(supabaseClient: SupabaseClient, phoneNumber: string, contactName: string, fromMe: boolean): Promise<string | null> {
  console.log(`Finding or creating customer with phone: ${phoneNumber}, contactName: ${contactName}, fromMe: ${fromMe}`);

  // Use the phone number as provided
  const formattedPhoneNumber = phoneNumber;
  
  // Try to find existing customer(s)
  const { data: existingCustomers, error: customerFetchError } = await supabaseClient
    .from('customers')
    .select('id, name')
    .eq('phone_number', formattedPhoneNumber); // Fetches all matches
  
  if (customerFetchError) {
    console.error('Error fetching existing customer(s):', customerFetchError);
    return null;
  }

  let customerToProcess: { id: string; name: string | null } | null = null;

  if (existingCustomers && existingCustomers.length > 0) {
    if (existingCustomers.length > 1) {
      console.warn(`[customerHandler] Duplicate customers found for phone ${formattedPhoneNumber}. Using the first one (ID: ${existingCustomers[0].id}). Consider data cleanup.`);
    }
    customerToProcess = existingCustomers[0]; // Use the first customer found
  }
  
  // If customer exists
  if (customerToProcess) {
    console.log(`Found existing customer with ID: ${customerToProcess.id}`);
    
    // Only update name if message is from customer (not from Me) AND we have a contact name AND 
    // either the existing customer has no name or the name is the phone number
    if (!fromMe && contactName && 
        (!customerToProcess.name || customerToProcess.name === formattedPhoneNumber)) {
      console.log(`Updating existing customer name from ${customerToProcess.name} to ${contactName}`);
      await supabaseClient
        .from('customers')
        .update({ name: contactName })
        .eq('id', customerToProcess.id);
    }
    
    return customerToProcess.id;
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


/**
 * Adds a new customer contact or updates an existing one by phone number.
 */
export async function addOrUpdateCustomerContact(supabaseClient: SupabaseClient, phoneNumber: string, name: string): Promise<string | null> {
  console.log(`Adding or updating customer contact with phone: ${phoneNumber}, name: ${name}`);

  // Use the phone number as provided
  const formattedPhoneNumber = phoneNumber;

  // Try to find existing customer(s)
  const { data: existingCustomers, error: customerFetchError } = await supabaseClient
    .from('customers')
    .select('id')
    .eq('phone_number', formattedPhoneNumber); // Fetches all matches

  if (customerFetchError) {
    console.error('Error fetching existing customer(s) during add/update:', customerFetchError);
    return null;
  }

  let customerToUpdate: { id: string } | null = null;

  if (existingCustomers && existingCustomers.length > 0) {
    if (existingCustomers.length > 1) {
      console.warn(`[customerHandler - addOrUpdate] Duplicate customers found for phone ${formattedPhoneNumber}. Updating the first one (ID: ${existingCustomers[0].id}). Consider data cleanup.`);
    }
    customerToUpdate = existingCustomers[0]; // Use the first customer found
  }

  // If customer exists, update their name
  if (customerToUpdate) {
    console.log(`Found existing customer with ID: ${customerToUpdate.id}. Updating name to ${name}`);
    const { error: updateError } = await supabaseClient
      .from('customers')
      .update({ name: name })
      .eq('id', customerToUpdate.id);

    if (updateError) {
      console.error('Error updating customer name:', updateError);
      return null;
    }
    return customerToUpdate.id;
  }

  // Otherwise, create a new customer
  console.log(`Creating new customer contact with phone: ${formattedPhoneNumber}, name: ${name}`);
  const { data: newCustomer, error: createCustomerError } = await supabaseClient
    .from('customers')
    .insert({
      phone_number: formattedPhoneNumber,
      name: name,
    })
    .select('id')
    .single();

  if (createCustomerError) {
    console.error('Error creating new customer contact:', createCustomerError);
    return null;
  }

  console.log(`Created new customer contact with ID: ${newCustomer.id}`);
  return newCustomer.id;
}

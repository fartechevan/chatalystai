// deno-lint-ignore-file
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

export async function findOrCreateCustomer(supabaseClient: SupabaseClient, phoneNumber: string, contactName: string, fromMe: boolean): Promise<string | null> {
    const formattedPhoneNumber = phoneNumber;
    const { data: existingCustomers, error: customerFetchError } = await supabaseClient
        .from('customers')
        .select('id, name')
        .eq('phone_number', formattedPhoneNumber);

    if (customerFetchError) {
        console.error('Error fetching existing customer(s):', customerFetchError);
        return null;
    }

    let customerToProcess: { id: string; name: string | null } | null = null;
    if (existingCustomers && existingCustomers.length > 0) {
        customerToProcess = existingCustomers[0];
    }

    if (customerToProcess) {
        if (!fromMe && contactName && (!customerToProcess.name || customerToProcess.name === formattedPhoneNumber)) {
            await supabaseClient.from('customers').update({ name: contactName }).eq('id', customerToProcess.id);
        }
        return customerToProcess.id;
    }

    const customerName = !fromMe && contactName ? contactName : "";
    const { data: newCustomer, error: createCustomerError } = await supabaseClient
        .from('customers')
        .insert({ phone_number: formattedPhoneNumber, name: customerName })
        .select()
        .single();

    if (createCustomerError) {
        console.error('Error creating new customer:', createCustomerError);
        return null;
    }
    return newCustomer.id;
}

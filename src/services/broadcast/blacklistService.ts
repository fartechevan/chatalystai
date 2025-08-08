import { supabase } from '@/integrations/supabase/client';

export interface BlacklistCheckResult {
  validCustomers: Array<{ id: string; phone_number: string }>;
  blacklistedCustomers: Array<{ id: string; phone_number: string }>;
  validPhoneNumbers: string[];
  blacklistedPhoneNumbers: string[];
}

export interface CustomerInfo {
  id: string;
  phone_number: string;
}

/**
 * Check customers against the blacklisted_customers table
 * @param customers Array of customer objects with id and phone_number
 * @returns BlacklistCheckResult with separated valid and blacklisted customers
 */
export const checkCustomersAgainstBlacklist = async (
  customers: CustomerInfo[]
): Promise<BlacklistCheckResult> => {
  if (customers.length === 0) {
    return {
      validCustomers: [],
      blacklistedCustomers: [],
      validPhoneNumbers: [],
      blacklistedPhoneNumbers: []
    };
  }

  try {
    const customerIds = customers.map(c => c.id);
    const phoneNumbers = customers.map(c => c.phone_number);

    // Query blacklisted_customers table for both ID and phone number matches
    // Using any to bypass TypeScript type checking since the table exists but isn't in types
    const { data: blacklistedData, error } = await (supabase as any)
      .from('blacklisted_customers')
      .select('id, phone_number')
      .or(`id.in.(${customerIds.join(',')}),phone_number.in.(${phoneNumbers.map(p => `"${p}"`).join(',')})`);

    if (error) {
      console.error('Error checking blacklist:', error);
      throw error;
    }

    const blacklistedIds = new Set((blacklistedData || []).map((b: any) => b.id));
    const blacklistedPhones = new Set((blacklistedData || []).map((b: any) => b.phone_number));

    const validCustomers: CustomerInfo[] = [];
    const blacklistedCustomers: CustomerInfo[] = [];

    customers.forEach(customer => {
      const isBlacklistedById = blacklistedIds.has(customer.id);
      const isBlacklistedByPhone = blacklistedPhones.has(customer.phone_number);
      
      if (isBlacklistedById || isBlacklistedByPhone) {
        blacklistedCustomers.push(customer);
        console.log(`Blacklisted customer skipped: ${customer.phone_number}`);
      } else {
        validCustomers.push(customer);
      }
    });

    return {
      validCustomers,
      blacklistedCustomers,
      validPhoneNumbers: validCustomers.map(c => c.phone_number),
      blacklistedPhoneNumbers: blacklistedCustomers.map(c => c.phone_number)
    };
  } catch (error) {
    console.error('Error in checkCustomersAgainstBlacklist:', error);
    throw error;
  }
};

/**
 * Check phone numbers against the blacklisted_customers table (for CSV imports)
 * @param phoneNumbers Array of phone numbers to check
 * @returns BlacklistCheckResult with separated valid and blacklisted phone numbers
 */
export const checkPhoneNumbersAgainstBlacklist = async (
  phoneNumbers: string[]
): Promise<BlacklistCheckResult> => {
  if (phoneNumbers.length === 0) {
    return {
      validCustomers: [],
      blacklistedCustomers: [],
      validPhoneNumbers: [],
      blacklistedPhoneNumbers: []
    };
  }

  try {
    // Query blacklisted_customers table for phone number matches
    // Using any to bypass TypeScript type checking since the table exists but isn't in types
    const { data: blacklistedData, error } = await (supabase as any)
      .from('blacklisted_customers')
      .select('phone_number')
      .in('phone_number', phoneNumbers);

    if (error) {
      console.error('Error checking phone numbers against blacklist:', error);
      throw error;
    }

    const blacklistedPhones = new Set((blacklistedData || []).map((b: any) => b.phone_number));

    const validPhoneNumbers: string[] = [];
    const blacklistedPhoneNumbers: string[] = [];

    phoneNumbers.forEach(phone => {
      if (blacklistedPhones.has(phone)) {
        blacklistedPhoneNumbers.push(phone);
        console.log(`Blacklisted phone number skipped: ${phone}`);
      } else {
        validPhoneNumbers.push(phone);
      }
    });

    return {
      validCustomers: [],
      blacklistedCustomers: [],
      validPhoneNumbers,
      blacklistedPhoneNumbers
    };
  } catch (error) {
    console.error('Error in checkPhoneNumbersAgainstBlacklist:', error);
    throw error;
  }
};

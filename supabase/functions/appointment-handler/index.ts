import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabaseClient.ts';

interface AppointmentRequest {
  action: 'create' | 'get' | 'update' | 'delete';
  // For create/update
  title?: string;
  start_time?: string;
  end_time?: string;
  contact_identifier?: string;
  notes?: string;
  source_channel?: string;
  agent_id?: string;
  session_id?: string;
  status?: string;
  // For get/update/delete
  appointment_id?: string;
  // For get by contact
  limit?: number;
  include_past?: boolean;
}

interface AppointmentResponse {
  success: boolean;
  appointment_id?: string;
  appointments?: any[];
  message?: string;
  error?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createSupabaseClient(req);

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const requestData: AppointmentRequest = await req.json();

    if (!requestData.action) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Missing required field: action' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    let response: AppointmentResponse;

    switch (requestData.action) {
      case 'create': {
        // Validate required fields for creation
        if (!requestData.title || !requestData.start_time || !requestData.contact_identifier) {
          return new Response(
            JSON.stringify({ 
              success: false,
              error: 'Missing required fields: title, start_time, and contact_identifier are required for create action' 
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        // Validate date format
        const startTime = new Date(requestData.start_time);
        if (isNaN(startTime.getTime())) {
          return new Response(
            JSON.stringify({ 
              success: false,
              error: 'Invalid start_time format. Please use ISO 8601 format.' 
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        // Set default end time if not provided (1 hour after start time)
        let endTime: Date;
        if (requestData.end_time) {
          endTime = new Date(requestData.end_time);
          if (isNaN(endTime.getTime())) {
            return new Response(
              JSON.stringify({ 
                success: false,
                error: 'Invalid end_time format. Please use ISO 8601 format.' 
              }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            );
          }
        } else {
          endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // Add 1 hour
        }

        // Validate that end time is after start time
        if (endTime <= startTime) {
          return new Response(
            JSON.stringify({ 
              success: false,
              error: 'End time must be after start time' 
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        // Find or create customer
        let customerId: string;
        const { data: existingCustomer } = await supabaseClient
          .from('customers')
          .select('id')
          .eq('phone_number', requestData.contact_identifier)
          .single();

        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          const { data: newCustomer, error: customerError } = await supabaseClient
            .from('customers')
            .insert({
              name: `Customer ${requestData.contact_identifier}`,
              phone_number: requestData.contact_identifier,
              created_at: new Date().toISOString()
            })
            .select('id')
            .single();

          if (customerError) {
            console.error('Error creating customer:', customerError);
            return new Response(
              JSON.stringify({ 
                success: false,
                error: 'Failed to create customer record' 
              }),
              { 
                status: 500, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            );
          }

          customerId = newCustomer.id;
        }

        // Create the appointment
        const appointmentData = {
          title: requestData.title,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          contact_identifier: requestData.contact_identifier,
          customer_id: customerId,
          notes: requestData.notes || '',
          source_channel: requestData.source_channel || 'ai_agent',
          status: requestData.status || 'scheduled',
          created_at: new Date().toISOString()
        };

        const { data: appointment, error: appointmentError } = await supabaseClient
          .from('appointments')
          .insert(appointmentData)
          .select('id')
          .single();

        if (appointmentError) {
          console.error('Error creating appointment:', appointmentError);
          return new Response(
            JSON.stringify({ 
              success: false,
              error: 'Failed to create appointment' 
            }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        response = {
          success: true,
          appointment_id: appointment.id,
          message: `Appointment "${requestData.title}" has been successfully booked for ${startTime.toLocaleString()}`
        };
        break;
      }

      case 'get': {
        if (!requestData.contact_identifier) {
          return new Response(
            JSON.stringify({ 
              success: false,
              error: 'Missing required field: contact_identifier for get action' 
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        let query = supabaseClient
          .from('appointments')
          .select('*')
          .eq('contact_identifier', requestData.contact_identifier);

        // Filter out past appointments unless explicitly requested
        if (!requestData.include_past) {
          query = query.gte('start_time', new Date().toISOString());
        }

        // Apply limit if specified
        if (requestData.limit) {
          query = query.limit(requestData.limit);
        }

        // Order by start time
        query = query.order('start_time', { ascending: true });

        const { data: appointments, error: getError } = await query;

        if (getError) {
          console.error('Error fetching appointments:', getError);
          return new Response(
            JSON.stringify({ 
              success: false,
              error: 'Failed to fetch appointments' 
            }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        response = {
          success: true,
          appointments: appointments || [],
          message: `Found ${appointments?.length || 0} appointments`
        };
        break;
      }

      case 'update': {
        if (!requestData.appointment_id) {
          return new Response(
            JSON.stringify({ 
              success: false,
              error: 'Missing required field: appointment_id for update action' 
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        const updateData: any = {};
        if (requestData.title) updateData.title = requestData.title;
        if (requestData.start_time) {
          const startTime = new Date(requestData.start_time);
          if (isNaN(startTime.getTime())) {
            return new Response(
              JSON.stringify({ 
                success: false,
                error: 'Invalid start_time format. Please use ISO 8601 format.' 
              }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            );
          }
          updateData.start_time = startTime.toISOString();
        }
        if (requestData.end_time) {
          const endTime = new Date(requestData.end_time);
          if (isNaN(endTime.getTime())) {
            return new Response(
              JSON.stringify({ 
                success: false,
                error: 'Invalid end_time format. Please use ISO 8601 format.' 
              }),
              { 
                status: 400, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            );
          }
          updateData.end_time = endTime.toISOString();
        }
        if (requestData.notes !== undefined) updateData.notes = requestData.notes;
        if (requestData.status) updateData.status = requestData.status;
        updateData.updated_at = new Date().toISOString();

        const { data: updatedAppointment, error: updateError } = await supabaseClient
          .from('appointments')
          .update(updateData)
          .eq('id', requestData.appointment_id)
          .select('id')
          .single();

        if (updateError) {
          console.error('Error updating appointment:', updateError);
          return new Response(
            JSON.stringify({ 
              success: false,
              error: 'Failed to update appointment' 
            }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        response = {
          success: true,
          appointment_id: updatedAppointment.id,
          message: 'Appointment updated successfully'
        };
        break;
      }

      case 'delete': {
        if (!requestData.appointment_id) {
          return new Response(
            JSON.stringify({ 
              success: false,
              error: 'Missing required field: appointment_id for delete action' 
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        const { error: deleteError } = await supabaseClient
          .from('appointments')
          .delete()
          .eq('id', requestData.appointment_id);

        if (deleteError) {
          console.error('Error deleting appointment:', deleteError);
          return new Response(
            JSON.stringify({ 
              success: false,
              error: 'Failed to delete appointment' 
            }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        response = {
          success: true,
          message: 'Appointment deleted successfully'
        };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ 
            success: false,
            error: `Unsupported action: ${requestData.action}. Supported actions are: create, get, update, delete` 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in appointment-handler function:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: `Internal server error: ${errorMessage}` 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
// @deno-types="https://deno.land/std@0.208.0/http/server.ts"
import { serve } from 'std/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabaseClient.ts';
import { Database } from '../_shared/database.types.ts';

interface AppointmentBookingRequest {
  title: string
  start_time: string
  end_time?: string
  contact_identifier: string
  notes?: string
  source_channel?: string
  agent_id?: string
  session_id?: string
}

interface AppointmentBookingResponse {
  success: boolean
  appointment_id?: string
  message: string
  error?: string
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createSupabaseClient(req)

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const requestData: AppointmentBookingRequest = await req.json()

    // Validate required fields
    if (!requestData.title || !requestData.start_time || !requestData.contact_identifier) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Missing required fields: title, start_time, and contact_identifier are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate date format
    const startTime = new Date(requestData.start_time)
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
      )
    }

    // Set default end time if not provided (1 hour after start time)
    let endTime: Date
    if (requestData.end_time) {
      endTime = new Date(requestData.end_time)
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
        )
      }
    } else {
      endTime = new Date(startTime.getTime() + 60 * 60 * 1000) // Add 1 hour
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
      )
    }

    // Check if customer exists, if not create one
    let customerId: string | null = null
    
    // First, try to find existing customer by contact identifier
    const { data: existingCustomer } = await supabaseClient
      .from('customers')
      .select('id')
      .eq('phone_number', requestData.contact_identifier)
      .single()

    if (existingCustomer) {
      customerId = existingCustomer.id
    } else {
      // Create new customer
      const { data: newCustomer, error: customerError } = await supabaseClient
        .from('customers')
        .insert({
          name: `Customer ${requestData.contact_identifier}`,
          phone_number: requestData.contact_identifier,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single()

      if (customerError) {
        console.error('Error creating customer:', customerError)
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Failed to create customer record' 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      customerId = newCustomer.id
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
      status: 'scheduled' as const,
      created_at: new Date().toISOString()
    }

    const { data: appointment, error: appointmentError } = await supabaseClient
      .from('appointments')
      .insert(appointmentData)
      .select('id')
      .single()

    if (appointmentError) {
      console.error('Error creating appointment:', appointmentError)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to create appointment' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Log the appointment booking for analytics (optional)
    if (requestData.agent_id && requestData.session_id) {
      await supabaseClient
        .from('agent_interactions')
        .insert({
          agent_id: requestData.agent_id,
          session_id: requestData.session_id,
          interaction_type: 'appointment_booking',
          metadata: {
            appointment_id: appointment.id,
            title: requestData.title,
            start_time: startTime.toISOString()
          },
          created_at: new Date().toISOString()
        })
        .single()
    }

    const response: AppointmentBookingResponse = {
      success: true,
      appointment_id: appointment.id,
      message: `Appointment "${requestData.title}" has been successfully booked for ${startTime.toLocaleString()}`
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in book-appointment function:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
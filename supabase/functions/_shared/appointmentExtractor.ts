import OpenAI from "openai";

export interface ExtractedAppointment {
  title: string;
  start_time: string;
  end_time?: string;
  notes?: string;
  confidence: number; // 0-1 scale
  extracted_info: {
    date_mentioned: boolean;
    time_mentioned: boolean;
    service_mentioned: boolean;
    duration_mentioned: boolean;
  };
}

export interface AppointmentExtractionResult {
  has_appointment_request: boolean;
  appointment?: ExtractedAppointment;
  clarification_needed?: string[];
  suggested_response?: string;
}

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

/**
 * Extracts appointment information from a user message using OpenAI
 */
export async function extractAppointmentFromMessage(
  userMessage: string,
  contactIdentifier: string,
  currentDateTime: string = new Date().toISOString()
): Promise<AppointmentExtractionResult> {
  try {
    const systemPrompt = `You are an appointment booking assistant. Your job is to analyze user messages and extract appointment booking information.

Current date and time: ${currentDateTime}

Analyze the user's message and determine:
1. If they are requesting to book an appointment
2. Extract appointment details if present
3. Identify what information is missing
4. Suggest clarifying questions if needed

Respond with a JSON object in this exact format:
{
  "has_appointment_request": boolean,
  "appointment": {
    "title": "string (service/appointment type)",
    "start_time": "ISO 8601 datetime string",
    "end_time": "ISO 8601 datetime string (optional)",
    "notes": "string (any additional details)",
    "confidence": number (0-1 scale),
    "extracted_info": {
      "date_mentioned": boolean,
      "time_mentioned": boolean,
      "service_mentioned": boolean,
      "duration_mentioned": boolean
    }
  },
  "clarification_needed": ["array of missing information"],
  "suggested_response": "string (helpful response to user)"
}

Rules:
- Only set has_appointment_request to true if the user is clearly trying to book/schedule something
- For relative dates like "tomorrow", "next week", calculate the actual date based on current time
- For relative times like "morning", "afternoon", use reasonable defaults (9 AM, 2 PM)
- If no specific time is mentioned, suggest common business hours
- Default appointment duration is 1 hour unless specified
- Be conservative with confidence scores - only high confidence (0.8+) for very clear requests
- Include helpful clarification questions for missing information

Examples of appointment requests:
- "I'd like to book an appointment"
- "Can I schedule a meeting tomorrow at 2pm?"
- "I need to see the doctor next week"
- "Book me for a consultation"

Examples of NON-appointment requests:
- "What are your hours?"
- "How much does it cost?"
- "I have a question about my account"
- General inquiries or support questions`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      temperature: 0.1,
      max_tokens: 1000,
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    const result: AppointmentExtractionResult = JSON.parse(responseContent);
    
    // Validate the response structure
    if (typeof result.has_appointment_request !== 'boolean') {
      throw new Error('Invalid response format: missing has_appointment_request');
    }

    // If it's an appointment request, validate the appointment object
    if (result.has_appointment_request && result.appointment) {
      const apt = result.appointment;
      if (!apt.title || !apt.start_time || typeof apt.confidence !== 'number') {
        throw new Error('Invalid appointment format');
      }

      // Validate date formats
      const startTime = new Date(apt.start_time);
      if (isNaN(startTime.getTime())) {
        throw new Error('Invalid start_time format');
      }

      if (apt.end_time) {
        const endTime = new Date(apt.end_time);
        if (isNaN(endTime.getTime())) {
          throw new Error('Invalid end_time format');
        }
      }
    }

    return result;

  } catch (error) {
    console.error('Error extracting appointment from message:', error);
    
    // Return a safe fallback response
    return {
      has_appointment_request: false,
      suggested_response: "I'm sorry, I had trouble understanding your request. Could you please provide more details about what you'd like to schedule?"
    };
  }
}

/**
 * Validates if an appointment has sufficient information to be booked
 */
export function validateAppointmentForBooking(appointment: ExtractedAppointment): {
  is_valid: boolean;
  missing_fields: string[];
  suggestions: string[];
} {
  const missing_fields: string[] = [];
  const suggestions: string[] = [];

  if (!appointment.title || appointment.title.trim() === '') {
    missing_fields.push('service/appointment type');
    suggestions.push('What type of appointment would you like to book?');
  }

  if (!appointment.start_time) {
    missing_fields.push('date and time');
    suggestions.push('When would you like to schedule this appointment?');
  } else {
    const startTime = new Date(appointment.start_time);
    const now = new Date();
    
    if (startTime <= now) {
      missing_fields.push('future date/time');
      suggestions.push('Please provide a future date and time for your appointment.');
    }
  }

  // Check confidence level
  if (appointment.confidence < 0.7) {
    suggestions.push('Could you please provide more specific details about your appointment request?');
  }

  return {
    is_valid: missing_fields.length === 0 && appointment.confidence >= 0.7,
    missing_fields,
    suggestions
  };
}

/**
 * Generates a confirmation message for a successfully booked appointment
 */
export function generateAppointmentConfirmation(
  appointment: ExtractedAppointment,
  appointmentId: string
): string {
  const startTime = new Date(appointment.start_time);
  const formattedDate = startTime.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const formattedTime = startTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  let confirmation = `✅ **Appointment Confirmed!**\n\n`;
  confirmation += `📅 **${appointment.title}**\n`;
  confirmation += `🗓️ **Date:** ${formattedDate}\n`;
  confirmation += `⏰ **Time:** ${formattedTime}`;
  
  if (appointment.end_time) {
    const endTime = new Date(appointment.end_time);
    const formattedEndTime = endTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    confirmation += ` - ${formattedEndTime}`;
  }
  
  confirmation += `\n🆔 **Reference:** ${appointmentId}`;
  
  if (appointment.notes) {
    confirmation += `\n📝 **Notes:** ${appointment.notes}`;
  }
  
  confirmation += `\n\nWe look forward to seeing you! If you need to reschedule or cancel, please let us know as soon as possible.`;
  
  return confirmation;
}
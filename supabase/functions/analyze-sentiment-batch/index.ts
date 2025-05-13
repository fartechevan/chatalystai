// Using Deno.serve and full logic with extensive logging
import "jsr:@supabase/functions-js/edge-runtime.d.ts"; // For Deno global types in Supabase env

// Note: corsHeaders, createSupabaseServiceRoleClient, openai, and utils are now imported inside Deno.serve
// to ensure they are loaded within the request context if that helps with any loading issues.
// However, typically top-level imports are fine. This is just a cautious approach.

console.log("analyze-sentiment-batch: FULL LOGIC - Handler script loaded!");

Deno.serve(async (req: Request) => {
  console.log("analyze-sentiment-batch: FULL LOGIC - Request received.");

  // Dynamically import dependencies within the handler
  // This is unusual but can help isolate issues if top-level imports cause silent crashes
  const { corsHeaders } = await import("../_shared/cors.ts");
  const { createSupabaseServiceRoleClient } = await import("../_shared/supabaseClient.ts");
  const { openai } = await import("../_shared/openaiUtils.ts");
  const {
    parseBatchRequest,
    fetchConversationsByDateRange,
    formatConversationTranscript,
    analyzeSentimentWithOpenAI,
  } = await import("./utils.ts");

  if (req.method === 'OPTIONS') {
    console.log("analyze-sentiment-batch: FULL LOGIC - OPTIONS request received.");
    return new Response(null, { headers: corsHeaders });
  }

  console.log("analyze-sentiment-batch: FULL LOGIC - Received request method: " + req.method);

  try {
    console.log("analyze-sentiment-batch: FULL LOGIC - Entering try block.");
    if (!openai) {
      console.error("analyze-sentiment-batch: FULL LOGIC - OpenAI client is not initialized.");
      throw new Error("OpenAI client is not initialized (API key likely missing).");
    }
    console.log("analyze-sentiment-batch: FULL LOGIC - OpenAI client checked.");

    // Assuming parseBatchRequest handles req.json()
    const { startDate, endDate } = await parseBatchRequest(req);
    console.log("analyze-sentiment-batch: FULL LOGIC - Request parsed. startDate:", startDate, "endDate:", endDate);

    const supabaseClient = createSupabaseServiceRoleClient();
    console.log("analyze-sentiment-batch: FULL LOGIC - Supabase client created.");

    const conversations = await fetchConversationsByDateRange(supabaseClient, startDate, endDate);
    console.log("analyze-sentiment-batch: FULL LOGIC - Conversations fetched. Count:", conversations ? conversations.length : 0);

    if (!conversations || conversations.length === 0) {
      console.log("analyze-sentiment-batch: FULL LOGIC - No conversations found in date range.");
      return new Response(
        JSON.stringify({ message: "No conversations found in the specified date range." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;
    let unknownCount = 0; // Add unknown count
    const conversationIds = conversations.map(c => c.conversation_id);
    const analysisDetails: Array<{ conversation_id: string; sentiment: 'good' | 'moderate' | 'bad' | 'unknown'; description: string | null }> = []; // Array to hold details

    console.log("analyze-sentiment-batch: FULL LOGIC - Starting sentiment analysis loop. Count:", conversations.length);
    for (const conv of conversations) {
      let sentimentResult: 'good' | 'moderate' | 'bad' | 'unknown' = 'unknown';
      let descriptionResult: string | null = null;

      try {
        const transcript = await formatConversationTranscript(supabaseClient, conv.conversation_id);
        if (transcript && transcript.trim() !== "") {
          const analysisResult = await analyzeSentimentWithOpenAI(openai, transcript);
          descriptionResult = analysisResult.description || null; // Store description

          if (analysisResult.sentiment === "Positive") {
            sentimentResult = 'good';
            positiveCount++;
          } else if (analysisResult.sentiment === "Negative") {
            sentimentResult = 'bad';
            negativeCount++;
          } else { // Assume Neutral if not Positive/Negative
            sentimentResult = 'moderate';
            neutralCount++;
          }
        } else {
          descriptionResult = "Transcript was empty or invalid.";
          sentimentResult = 'unknown'; // Mark as unknown if no transcript
          unknownCount++;
        }
      } catch (analysisError) {
         console.error(`analyze-sentiment-batch: Error analyzing conv ${conv.conversation_id}:`, analysisError.message);
         descriptionResult = `Analysis failed: ${analysisError.message}`;
         sentimentResult = 'unknown'; // Mark as unknown on analysis error
         unknownCount++;
      }

      // Add details for this conversation
      analysisDetails.push({
        conversation_id: conv.conversation_id,
        sentiment: sentimentResult,
        description: descriptionResult,
      });
    }
    console.log("analyze-sentiment-batch: FULL LOGIC - Sentiment analysis loop completed.");
    console.log("analyze-sentiment-batch: FULL LOGIC - Counts - Positive:", positiveCount, "Negative:", negativeCount, "Neutral:", neutralCount, "Unknown:", unknownCount);

    // Update overall sentiment string if needed, or keep as is
    const overallSentiment = `Positive: ${positiveCount}, Negative: ${negativeCount}, Neutral: ${neutralCount}, Unknown: ${unknownCount}`;

    const insertPayload = {
      start_date: startDate,
      end_date: endDate,
      overall_sentiment: overallSentiment, // Keep this as a string summary
      positive_count: positiveCount,     // Add new count
      negative_count: negativeCount,     // Add new count
      neutral_count: neutralCount,       // Add new count
      conversation_ids: conversationIds,
    };

    console.log("analyze-sentiment-batch: FULL LOGIC - Attempting to insert:", JSON.stringify(insertPayload, null, 2));

    const { data: batchData, error: batchError } = await supabaseClient
      .from('batch_sentiment_analysis')
      .insert([insertPayload])
      .select()
      .single();

    console.log("analyze-sentiment-batch: FULL LOGIC - Insert result - batchError:", JSON.stringify(batchError, null, 2));
    console.log("analyze-sentiment-batch: FULL LOGIC - Insert result - batchData:", JSON.stringify(batchData, null, 2));

    if (batchError) {
      console.error("analyze-sentiment-batch: FULL LOGIC - DB error storing main batch analysis (logged above):", batchError.message);
      throw new Error("Database error storing batch analysis: " + batchError.message);
    }

    if (!batchData || !batchData.id) {
      console.error("analyze-sentiment-batch: FULL LOGIC - Batch data or ID is null after insert. batchData:", JSON.stringify(batchData, null, 2));
      throw new Error("Failed to retrieve batch analysis record after insert, or ID is missing.");
    }
    const batchAnalysisId = batchData.id;
    console.log("analyze-sentiment-batch: FULL LOGIC - Main batch insert successful, batchData.id:", batchAnalysisId);

    // --- Insert individual analysis details ---
    if (analysisDetails.length > 0) {
      const detailPayload = analysisDetails.map(detail => ({
        batch_analysis_id: batchAnalysisId,
        conversation_id: detail.conversation_id,
        sentiment: detail.sentiment,
        description: detail.description,
      }));

      console.log("analyze-sentiment-batch: FULL LOGIC - Attempting to insert details count:", detailPayload.length);
      const { error: detailError } = await supabaseClient
        .from('batch_sentiment_analysis_details')
        .insert(detailPayload);

      if (detailError) {
        console.error("analyze-sentiment-batch: FULL LOGIC - DB error storing batch analysis DETAILS:", detailError.message);
        // Decide how to handle this - maybe log and continue, or throw?
        // For now, log and continue, but the frontend might not get details later.
        console.warn("analyze-sentiment-batch: Failed to store individual sentiment details for batch:", batchAnalysisId);
      } else {
        console.log("analyze-sentiment-batch: FULL LOGIC - Details insert successful for batch:", batchAnalysisId);
      }
    }
    // --- End Insert details ---


    return new Response(
      JSON.stringify({
        message: "Batch sentiment analysis completed.",
        batch_analysis_id: batchData.id,
        overall_sentiment: overallSentiment,
        conversations_processed: conversations.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('analyze-sentiment-batch: FULL LOGIC - Error in handler:', error.message);
    if (error instanceof Error && error.stack) {
      console.error("analyze-sentiment-batch: FULL LOGIC - Error stack:", error.stack);
    }
    let status = 500;
    // ... (status code logic from before)
    if (error.message.includes("Invalid JSON") || error.message.includes("Missing required fields")) status = 400;
    if (error.message.startsWith("Database error")) status = 500;
    if (error.message.startsWith("OpenAI API error")) status = 502;
    if (error.message === "OpenAI client is not initialized (API key likely missing).") status = 503;
    if (error.message === "Failed to retrieve batch analysis record after insert, or ID is missing.") status = 500;


    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

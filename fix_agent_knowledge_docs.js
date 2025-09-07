import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const fixAgentKnowledgeDocs = async () => {
  try {
    // Update the Chattalyst Agent with correct document IDs
    const { data, error } = await supabase
      .from('ai_agents')
      .update({
        knowledge_document_ids: [
          'ce7c1d85-a798-4743-abdb-1ca36ec7ab05', // Merged document_v11_pruned
          'ca8cb28f-4243-4b55-9399-1678c3b6e99d', // Chattalyst knowledge
          '2c735d28-d136-4cff-9254-d2e7334bc9cc'  // Chattalyst OOC
        ]
      })
      .eq('id', '6340b410-00c5-4969-89a9-5e4b4006fd83')
      .select();

    if (error) {
      console.error('Error updating agent:', error);
      return;
    }

    console.log('Agent updated successfully:', data);
  } catch (err) {
    console.error('Script error:', err);
  }
};

fixAgentKnowledgeDocs();
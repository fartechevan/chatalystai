import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ConversationParticipant } from "../types";

export function useParticipantsData() {
  const [participantsData, setParticipantsData] = useState<Record<string, ConversationParticipant[]>>({});
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(true);

  useEffect(() => {
    const loadParticipantsData = async () => {
      setIsLoadingParticipants(true);
      try {
        const { data, error } = await supabase
          .from('conversation_participants')
          .select('id, conversation_id, role, external_user_identifier, customer_id');

        if (error) {
          console.error('Error loading participants:', error);
          setParticipantsData({}); // Reset on error
          return;
        }

        // Create a mapping of conversation_id to participant data
        const participantsMap: Record<string, ConversationParticipant[]> = {};
        for (const participant of data || []) {
          // Ensure participant conforms to the type, handle potential nulls if necessary
          const typedParticipant: ConversationParticipant = {
             id: participant.id,
             conversation_id: participant.conversation_id,
             role: participant.role as 'admin' | 'member', // Cast role
             external_user_identifier: participant.external_user_identifier ?? undefined,
             customer_id: participant.customer_id ?? undefined,
             // profiles and customer would need separate fetching if required by the type directly
          };

          if (!participantsMap[typedParticipant.conversation_id]) {
            participantsMap[typedParticipant.conversation_id] = [];
          }
          participantsMap[typedParticipant.conversation_id].push(typedParticipant);
        }

        setParticipantsData(participantsMap);
      } catch (err) {
        console.error('Error in participant data processing:', err);
        setParticipantsData({}); // Reset on error
      } finally {
        setIsLoadingParticipants(false);
      }
    };

    loadParticipantsData();
  }, []); // Empty dependency array means this runs once on mount

  return { participantsData, isLoadingParticipants };
}

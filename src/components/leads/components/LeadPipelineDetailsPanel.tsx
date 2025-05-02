import React, { useState, useEffect } from 'react'; // Import useState, useEffect
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { X, Tag, Building, User } from 'lucide-react'; // Import necessary icons
import { Badge } from "@/components/ui/badge"; // Import Badge for tags
import type { Lead, Profile } from "@/components/dashboard/conversations/types"; // Import Profile type
import { supabase } from "@/integrations/supabase/client"; // Import supabase client

interface LeadPipelineDetailsPanelProps {
  lead: Lead | null;
  onClose: () => void;
}

export function LeadPipelineDetailsPanel({ lead, onClose }: LeadPipelineDetailsPanelProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [assigneeName, setAssigneeName] = useState<string>('Loading...');
  const [customerName, setCustomerName] = useState<string>('Loading...');
  const [companyName, setCompanyName] = useState<string>('Loading...');
  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState<boolean>(true);

  // Fetch profiles and customer data when component mounts or lead changes
  useEffect(() => {
    const fetchData = async () => {
      if (!lead) {
        setAssigneeName('N/A');
        setCustomerName('N/A');
        setCompanyName('N/A');
        setTags([]);
        setIsLoadingTags(false);
        return;
      }

      setAssigneeName('Loading...'); 
      setCustomerName('Loading...');
      setCompanyName('Loading...');
      setTags([]); // Reset tags
      setIsLoadingTags(true);
      setProfiles([]); // Reset profiles

      // --- Fetch Profiles (for Assignee) ---
      try {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*');
        
        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          setProfiles([]);
          setAssigneeName('Error loading user');
        } else if (profilesData) {
          setProfiles(profilesData);
          // Find assignee name after profiles are fetched
          if (lead?.assignee_id) {
            const assignee = profilesData.find(p => p.id === lead.assignee_id);
            setAssigneeName(assignee?.name || 'Unknown User');
          } else {
            setAssigneeName('Unassigned');
          }
        } else {
          setProfiles([]);
          setAssigneeName('Unassigned');
        }
      } catch (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        setProfiles([]);
        setAssigneeName('Error loading user');
      }

      // --- Fetch Customer Data ---
      if (lead.customer_id) {
        try {
          const { data: customerData, error: customerError } = await supabase
            .from('customers')
            .select('name, company_name')
            .eq('id', lead.customer_id)
            .maybeSingle(); // Use maybeSingle as customer might not exist

          if (customerError) {
            console.error('Error fetching customer:', customerError);
            setCustomerName('Error');
            setCompanyName('Error');
          } else if (customerData) {
            setCustomerName(customerData.name || 'N/A');
            setCompanyName(customerData.company_name || 'N/A');
          } else {
            setCustomerName('Not Found');
            setCompanyName('Not Found');
          }
        } catch (customerError) {
          console.error('Error fetching customer:', customerError);
          setCustomerName('Error');
          setCompanyName('Error');
        }
      } else {
        setCustomerName('No Customer ID');
        setCompanyName('No Customer ID');
      }

      // --- Fetch Tags ---
      try {
        const { data: tagData, error: tagError } = await supabase
          .from('lead_tags')
          .select('tags (id, name)') // Select id and name from the related tags table
          .eq('lead_id', lead.id);

        if (tagError) {
          console.error('Error fetching tags:', tagError);
          setTags([]);
        } else if (tagData) {
          // Extract the nested tag objects
          const extractedTags = tagData
            .map(item => item.tags)
            .filter(tag => tag !== null) as { id: string; name: string }[];
          setTags(extractedTags);
        } else {
          setTags([]);
        }
      } catch (tagError) {
        console.error('Error fetching tags:', tagError);
        setTags([]);
      } finally {
        setIsLoadingTags(false);
      }
    };

    fetchData();
  }, [lead]); // Re-run when lead changes

  if (!lead) {
    return null; // Don't render anything if no lead is selected
  }

  // Basic display for now, can be expanded later
  return (
    <div className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
        <CardTitle className="text-lg font-semibold">Lead Details</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </CardHeader>
      <CardContent className="p-4 flex-1 overflow-auto">
        <div className="space-y-3">
          <div>
            {/* Display fetched customer name */}
            <h4 className="font-medium mb-1">{customerName}</h4> 
            <p className="text-xs text-muted-foreground">ID: {lead.id}</p>
          </div>

          <div>
            <h5 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Value</h5>
            <p className="text-sm">{lead.value ? `${lead.value.toLocaleString()} RM` : 'N/A'}</p>
          </div>

          <div>
            <h5 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider flex items-center">
              <Building className="h-3 w-3 mr-1.5" /> Company
            </h5>
            {/* Display fetched company name */}
            <p className="text-sm">{companyName}</p> 
            {/* TODO: Add more company details if available */}
          </div>

          <div>
            <h5 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider flex items-center">
              <User className="h-3 w-3 mr-1.5" /> Responsible User
            </h5>
            <p className="text-sm">{assigneeName}</p> 
          </div>

          <div>
            <h5 className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider flex items-center">
              <Tag className="h-3 w-3 mr-1.5" /> Tags
            </h5>
            <div className="flex flex-wrap gap-1">
              {isLoadingTags ? (
                <p className="text-xs text-muted-foreground">Loading tags...</p>
              ) : tags.length > 0 ? (
                tags.map(tag => (
                  <Badge key={tag.id} variant="secondary">
                    {tag.name}
                  </Badge>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No tags</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </div>
  );
}

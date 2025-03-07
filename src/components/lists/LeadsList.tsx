
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { MoreHorizontal, Plus, Building, Mail, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useLeads } from "./hooks/useLeads";

export function LeadsList() {
  const { leads, loading, refreshLeads } = useLeads();
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filter leads based on search query
  const filteredLeads = leads.filter(lead => {
    const searchLower = searchQuery.toLowerCase();
    return (
      (lead.name && lead.name.toLowerCase().includes(searchLower)) ||
      (lead.company_name && lead.company_name.toLowerCase().includes(searchLower)) ||
      (lead.contact_email && lead.contact_email.toLowerCase().includes(searchLower)) ||
      (lead.contact_phone && lead.contact_phone.toLowerCase().includes(searchLower))
    );
  });

  // Format currency
  const formatCurrency = (value: number) => {
    return `${value.toLocaleString()} RM`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">LEADS</h2>
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
            Full list
          </Button>
          <Input 
            placeholder="Search and filter" 
            className="w-[200px] h-7 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="text-sm text-muted-foreground">
            {filteredLeads.length} leads
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          <Button size="sm" className="h-8">
            <Plus className="h-4 w-4 mr-2" />
            ADD LEAD
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          {loading ? (
            <div className="p-4 space-y-4">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="flex space-x-4">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-4 w-[150px]" />
                </div>
              ))}
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-background border-b">
                <tr>
                  <th className="w-12 p-3">
                    <Checkbox />
                  </th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                    NAME
                  </th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                    COMPANY
                  </th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                    STATUS
                  </th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                    PHONE
                  </th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">
                    EMAIL
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.length > 0 ? (
                  filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-muted/50">
                      <td className="p-3">
                        <Checkbox />
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{lead.name || "Unnamed Lead"}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(lead.value)}
                        </div>
                      </td>
                      <td className="p-3">
                        {lead.company_name ? (
                          <div className="flex items-center">
                            <Building className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                            <span>{lead.company_name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">No company</span>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs font-normal">
                          New
                        </Badge>
                      </td>
                      <td className="p-3">
                        {lead.contact_phone ? (
                          <div className="flex items-center">
                            <Phone className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                            <span>{lead.contact_phone}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">No phone</span>
                        )}
                      </td>
                      <td className="p-3">
                        {lead.contact_email ? (
                          <div className="flex items-center">
                            <Mail className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                            <span>{lead.contact_email}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">No email</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="text-center text-muted-foreground">
                    <td colSpan={6} className="py-8">
                      {searchQuery ? "No leads match your search" : "No leads found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

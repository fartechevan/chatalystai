import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, User, FileText, ArrowLeft, Plus } from "lucide-react";
import { format } from "date-fns";

interface Customer {
  id: string;
  name: string;
  phone_number: string;
  email: string | null;
  company_name: string | null;
}

interface Appointment {
  id: string;
  title: string;
  start_time: string;
  end_time: string | null;
  contact_identifier: string | null;
  source_channel: string | null;
  status: string | null;
  notes: string | null;
}

interface EditAppointmentFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function EditAppointmentForm({ onSuccess, onCancel }: EditAppointmentFormProps) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingAppointment, setLoadingAppointment] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [newCustomerLoading, setNewCustomerLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    start_time: "",
    end_time: "",
    contact_identifier: "",
    source_channel: "phone",
    status: "scheduled",
    notes: "",
  });

  const [newCustomerData, setNewCustomerData] = useState({
    name: "",
    phone_number: "",
    email: "",
    company_name: "",
  });

  // Fetch appointment data
  useEffect(() => {
    const fetchAppointment = async () => {
      if (!id) {
        toast({
          title: "Error",
          description: "No appointment ID provided",
          variant: "destructive",
        });
        navigate("/dashboard/leads/appointments");
        return;
      }

      try {
        const { data, error } = await supabase
          .from("appointments")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;

        if (data) {
          setFormData({
            title: data.title || "",
            start_time: data.start_time ? format(new Date(data.start_time), "yyyy-MM-dd'T'HH:mm") : "",
            end_time: data.end_time ? format(new Date(data.end_time), "yyyy-MM-dd'T'HH:mm") : "",
            contact_identifier: data.contact_identifier || "",
            source_channel: data.source_channel || "phone",
            status: data.status || "scheduled",
            notes: data.notes || "",
          });
        }
      } catch (error) {
        console.error("Error fetching appointment:", error);
        toast({
          title: "Error",
          description: "Failed to load appointment data",
          variant: "destructive",
        });
        navigate("/dashboard/leads/appointments");
      } finally {
        setLoadingAppointment(false);
      }
    };

    fetchAppointment();
  }, [id, navigate, toast]);

  // Fetch customers
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const { data, error } = await supabase
          .from("customers")
          .select("id, name, phone_number, email, company_name")
          .order("name");

        if (error) throw error;
        setCustomers(data || []);
      } catch (error) {
        console.error("Error fetching customers:", error);
        toast({
          title: "Error",
          description: "Failed to load customers",
          variant: "destructive",
        });
      } finally {
        setLoadingCustomers(false);
      }
    };

    fetchCustomers();
  }, [toast]);

  const handleAddCustomer = async () => {
    if (!newCustomerData.name.trim() || !newCustomerData.phone_number.trim()) {
      toast({
        title: "Validation Error",
        description: "Name and phone number are required",
        variant: "destructive",
      });
      return;
    }

    setNewCustomerLoading(true);
    try {
      const { data, error } = await supabase
        .from("customers")
        .insert([newCustomerData])
        .select()
        .single();

      if (error) throw error;

      // Update customers list
      setCustomers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      
      // Set the new customer as selected
      setFormData(prev => ({ ...prev, contact_identifier: data.id }));
      
      // Reset form and close dialog
      setNewCustomerData({ name: "", phone_number: "", email: "", company_name: "" });
      setIsAddCustomerOpen(false);
      
      toast({
        title: "Success",
        description: "Customer added successfully",
      });
    } catch (error) {
      console.error("Error adding customer:", error);
      toast({
        title: "Error",
        description: "Failed to add customer",
        variant: "destructive",
      });
    } finally {
      setNewCustomerLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.start_time) {
      toast({
        title: "Validation Error",
        description: "Title and start time are required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const appointmentData = {
        title: formData.title.trim(),
        start_time: new Date(formData.start_time).toISOString(),
        end_time: formData.end_time ? new Date(formData.end_time).toISOString() : null,
        contact_identifier: formData.contact_identifier || null,
        source_channel: formData.source_channel,
        status: formData.status,
        notes: formData.notes.trim() || null,
      };

      const { error } = await supabase
        .from("appointments")
        .update(appointmentData)
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Appointment updated successfully",
      });

      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/dashboard/leads/appointments");
      }
    } catch (error) {
      console.error("Error updating appointment:", error);
      toast({
        title: "Error",
        description: "Failed to update appointment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate("/dashboard/leads/appointments");
    }
  };

  if (loadingAppointment) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading appointment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Edit Appointment</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Appointment Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Title *
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter appointment title"
                required
              />
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Start Time *
                </Label>
                <Input
                  id="start_time"
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  End Time
                </Label>
                <Input
                  id="end_time"
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                />
              </div>
            </div>

            {/* Contact Identifier */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer
              </Label>
              <div className="flex gap-2">
                <Select
                  value={formData.contact_identifier}
                  onValueChange={(value) => setFormData({ ...formData, contact_identifier: value })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={loadingCustomers ? "Loading customers..." : "Select a customer"} />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{customer.name}</span>
                          <span className="text-sm text-muted-foreground">{customer.phone_number}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Dialog open={isAddCustomerOpen} onOpenChange={setIsAddCustomerOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" size="icon">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Customer</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="customer-name">Name *</Label>
                        <Input
                          id="customer-name"
                          value={newCustomerData.name}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                          placeholder="Enter customer name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="customer-phone">Phone Number *</Label>
                        <Input
                          id="customer-phone"
                          value={newCustomerData.phone_number}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, phone_number: e.target.value })}
                          placeholder="Enter phone number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="customer-email">Email</Label>
                        <Input
                          id="customer-email"
                          type="email"
                          value={newCustomerData.email}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, email: e.target.value })}
                          placeholder="Enter email address"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="customer-company">Company</Label>
                        <Input
                          id="customer-company"
                          value={newCustomerData.company_name}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, company_name: e.target.value })}
                          placeholder="Enter company name"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsAddCustomerOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          onClick={handleAddCustomer}
                          disabled={newCustomerLoading}
                        >
                          {newCustomerLoading ? "Adding..." : "Add Customer"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Source Channel */}
            <div className="space-y-2">
              <Label htmlFor="source_channel">Source Channel</Label>
              <Select
                value={formData.source_channel}
                onValueChange={(value) => setFormData({ ...formData, source_channel: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="walk-in">Walk-in</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="no-show">No Show</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any additional notes or details"
                rows={4}
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Updating..." : "Update Appointment"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
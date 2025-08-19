import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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

interface NewAppointmentFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function NewAppointmentForm({ onSuccess, onCancel }: NewAppointmentFormProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
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

  // Fetch customers on component mount
  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoadingCustomers(true);
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

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCustomerData.name || !newCustomerData.phone_number) {
      toast({
        title: "Error",
        description: "Name and phone number are required",
        variant: "destructive",
      });
      return;
    }

    try {
      setNewCustomerLoading(true);
      const { data, error } = await supabase
        .from("customers")
        .insert([
          {
            name: newCustomerData.name,
            phone_number: newCustomerData.phone_number,
            email: newCustomerData.email || null,
            company_name: newCustomerData.company_name || null,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Add new customer to the list and select it
      const newCustomer = data as Customer;
      setCustomers(prev => [...prev, newCustomer].sort((a, b) => a.name.localeCompare(b.name)));
      setFormData(prev => ({ ...prev, contact_identifier: newCustomer.id }));
      
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
        description: error instanceof Error ? error.message : "Failed to add customer",
        variant: "destructive",
      });
    } finally {
      setNewCustomerLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }

    if (!formData.start_time) {
      newErrors.start_time = "Start time is required";
    }

    if (formData.end_time && formData.start_time) {
      const startTime = new Date(formData.start_time);
      const endTime = new Date(formData.end_time);
      if (endTime <= startTime) {
        newErrors.end_time = "End time must be after start time";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('appointments')
        .insert([
          {
            title: formData.title,
            start_time: formData.start_time,
            end_time: formData.end_time || null,
            contact_identifier: formData.contact_identifier || null,
            source_channel: formData.source_channel || null,
            status: formData.status,
            notes: formData.notes || null
          }
        ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Appointment created successfully",
      });

      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/dashboard/leads/appointments');
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create appointment",
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
      navigate('/dashboard/leads/appointments');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  // Generate datetime-local input value from current date
  const getCurrentDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={handleCancel}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Appointments
        </Button>
        <h1 className="text-2xl font-bold">New Appointment</h1>
        <p className="text-muted-foreground">Create a new appointment entry</p>
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
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter appointment title"
                className={errors.title ? "border-destructive" : ""}
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title}</p>
              )}
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
                  onChange={(e) => handleInputChange('start_time', e.target.value)}
                  min={getCurrentDateTime()}
                  className={errors.start_time ? "border-destructive" : ""}
                />
                {errors.start_time && (
                  <p className="text-sm text-destructive">{errors.start_time}</p>
                )}
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
                  onChange={(e) => handleInputChange('end_time', e.target.value)}
                  min={formData.start_time || getCurrentDateTime()}
                  className={errors.end_time ? "border-destructive" : ""}
                />
                {errors.end_time && (
                  <p className="text-sm text-destructive">{errors.end_time}</p>
                )}
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-2">
              <Label htmlFor="contact_identifier" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Contact
              </Label>
              <div className="flex gap-2">
                <Select
                  value={formData.contact_identifier}
                  onValueChange={(value) => handleInputChange('contact_identifier', value)}
                >
                  <SelectTrigger className={`flex-1 ${errors.contact_identifier ? "border-destructive" : ""}`}>
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
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Add New Customer</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddCustomer} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="new_customer_name">Name *</Label>
                        <Input
                          id="new_customer_name"
                          value={newCustomerData.name}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                          placeholder="Customer name"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new_customer_phone">Phone Number *</Label>
                        <Input
                          id="new_customer_phone"
                          value={newCustomerData.phone_number}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, phone_number: e.target.value })}
                          placeholder="Phone number"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new_customer_email">Email</Label>
                        <Input
                          id="new_customer_email"
                          type="email"
                          value={newCustomerData.email}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, email: e.target.value })}
                          placeholder="Email address"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new_customer_company">Company</Label>
                        <Input
                          id="new_customer_company"
                          value={newCustomerData.company_name}
                          onChange={(e) => setNewCustomerData({ ...newCustomerData, company_name: e.target.value })}
                          placeholder="Company name"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsAddCustomerOpen(false)}
                          disabled={newCustomerLoading}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={newCustomerLoading}>
                          {newCustomerLoading ? "Adding..." : "Add Customer"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              {errors.contact_identifier && (
                <p className="text-sm text-destructive">{errors.contact_identifier}</p>
              )}
            </div>

            {/* Source Channel and Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="source_channel">Source Channel</Label>
                <Select
                  value={formData.source_channel}
                  onValueChange={(value) => handleInputChange('source_channel', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source channel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="walk-in">Walk-in</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="no-show">No Show</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Notes
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Additional notes or details about the appointment"
                rows={4}
              />
            </div>

            {/* Form Actions */}
            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                {loading ? "Creating..." : "Create Appointment"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
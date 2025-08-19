import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { MoreHorizontal, Plus, Search, Calendar, Clock } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Appointment {
  id: string;
  title: string;
  start_time: string;
  end_time: string | null;
  contact_identifier: string | null;
  source_channel: string | null;
  status: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function AppointmentsList() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('appointments')
        .select('*')
        .order('start_time', { ascending: false });

      if (fetchError) throw fetchError;
      
      const appointmentsData = data || [];
      setAppointments(appointmentsData);
      setFilteredAppointments(appointmentsData);
    } catch (fetchError: unknown) {
      console.error("Error fetching appointments:", fetchError);
      const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
      setError(`Failed to fetch appointments: ${errorMessage}`);
      setAppointments([]);
      setFilteredAppointments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredAppointments(appointments);
      return;
    }

    const filtered = appointments.filter(appointment => 
      appointment.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.contact_identifier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredAppointments(filtered);
  }, [appointments, searchTerm]);

  const handleDeleteAppointment = (appointment: Appointment) => {
    setAppointmentToDelete(appointment);
    setIsAlertOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!appointmentToDelete) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentToDelete.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Appointment deleted successfully.",
      });

      fetchAppointments();
    } catch (error: unknown) {
      console.error("Error deleting appointment:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({
        title: "Error",
        description: `Failed to delete appointment: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsAlertOpen(false);
      setAppointmentToDelete(null);
    }
  };

  const formatDateTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return date.toLocaleString();
  };

  const getStatusBadgeVariant = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      case 'completed':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="flex flex-col h-full p-4 space-y-4">
      {/* Header with search and actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search appointments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2 sm:mt-0 flex-shrink-0">
          <span className="text-sm text-muted-foreground">
            {loading ? 'Loading...' : `${filteredAppointments.length} appointments`}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 border rounded-lg overflow-hidden">
        <ScrollArea className="h-full">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-muted/50">
                <TableHead className="h-12 px-3 text-left align-middle w-12"><Checkbox /></TableHead>
                <TableHead className="h-12 px-3 text-left align-middle font-medium text-muted-foreground">TITLE</TableHead>
                <TableHead className="h-12 px-3 text-left align-middle font-medium text-muted-foreground">START TIME</TableHead>
                <TableHead className="h-12 px-3 text-left align-middle font-medium text-muted-foreground">END TIME</TableHead>
                <TableHead className="h-12 px-3 text-left align-middle font-medium text-muted-foreground">CONTACT</TableHead>
                <TableHead className="h-12 px-3 text-left align-middle font-medium text-muted-foreground">STATUS</TableHead>
                <TableHead className="h-12 px-3 text-left align-middle font-medium text-muted-foreground">CHANNEL</TableHead>
                <TableHead className="h-12 px-3 text-right align-middle font-medium text-muted-foreground w-12"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <TableRow key={index} className="hover:bg-muted/50">
                    <TableCell className="p-3 align-middle"><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell className="p-3 align-middle"><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell className="p-3 align-middle"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="p-3 align-middle"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="p-3 align-middle"><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell className="p-3 align-middle"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="p-3 align-middle"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="p-3 align-middle text-right"><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow><TableCell colSpan={8} className="h-24 text-center p-4 align-middle text-destructive">{error}</TableCell></TableRow>
              ) : filteredAppointments.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="h-24 text-center p-4 align-middle text-muted-foreground">No appointments found.</TableCell></TableRow>
              ) : (
                filteredAppointments.map((appointment) => (
                  <TableRow key={appointment.id} className="hover:bg-muted/50">
                    <TableCell className="p-3 align-middle"><Checkbox /></TableCell>
                    <TableCell className="p-3 align-middle font-medium">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {appointment.title || 'Untitled'}
                      </div>
                    </TableCell>
                    <TableCell className="p-3 align-middle text-muted-foreground">
                      {formatDateTime(appointment.start_time)}
                    </TableCell>
                    <TableCell className="p-3 align-middle text-muted-foreground">
                      {appointment.end_time ? formatDateTime(appointment.end_time) : '-'}
                    </TableCell>
                    <TableCell className="p-3 align-middle text-muted-foreground">
                      {appointment.contact_identifier || '-'}
                    </TableCell>
                    <TableCell className="p-3 align-middle">
                      <Badge variant={getStatusBadgeVariant(appointment.status)} className="font-normal text-xs">
                        {appointment.status || 'pending'}
                      </Badge>
                    </TableCell>
                    <TableCell className="p-3 align-middle text-muted-foreground">
                      {appointment.source_channel || '-'}
                    </TableCell>
                    <TableCell className="p-3 align-middle text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => navigate(`/dashboard/leads/appointments/view/${appointment.id}`)}>View Details</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => navigate(`/dashboard/leads/appointments/edit/${appointment.id}`)}>Edit Appointment</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onSelect={() => handleDeleteAppointment(appointment)}>Delete Appointment</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the appointment 
              "{appointmentToDelete?.title}" and remove its associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAppointmentToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
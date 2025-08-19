import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  MessageSquare,
  Phone,
  Edit,
  Trash2,
  MapPin,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export function ViewAppointmentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('No appointment ID provided');
      setLoading(false);
      return;
    }

    fetchAppointment();
  }, [id]);

  const fetchAppointment = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      if (!data) {
        throw new Error('Appointment not found');
      }

      setAppointment(data);
    } catch (err: unknown) {
      console.error('Error fetching appointment:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch appointment';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: 'Failed to load appointment details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!appointment) return;

    try {
      const { error: deleteError } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointment.id);

      if (deleteError) {
        throw deleteError;
      }

      toast({
        title: 'Success',
        description: 'Appointment deleted successfully',
      });

      navigate('/dashboard/leads/appointments');
    } catch (err: unknown) {
      console.error('Error deleting appointment:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete appointment',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <Skeleton className="h-8 w-32 mb-4" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard/leads/appointments')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Appointments
          </Button>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-destructive mb-4">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Appointment Not Found</h3>
            <p className="text-muted-foreground mb-4">
              {error || 'The appointment you are looking for does not exist or has been deleted.'}
            </p>
            <Button onClick={() => navigate('/dashboard/leads/appointments')}>
              Return to Appointments
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard/leads/appointments')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Appointments
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{appointment.title || 'Untitled Appointment'}</h1>
            <p className="text-muted-foreground mt-1">
              Created on {formatDate(appointment.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusBadgeVariant(appointment.status)} className="text-sm">
              {appointment.status || 'pending'}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/dashboard/leads/appointments/edit/${appointment.id}`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the appointment
                    "{appointment.title}" and remove all associated data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    Delete Appointment
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Appointment Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Appointment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">Start Time</p>
                <p className="text-sm text-muted-foreground">
                  {formatDateTime(appointment.start_time)}
                </p>
              </div>
            </div>
            {appointment.end_time && (
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">End Time</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDateTime(appointment.end_time)}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">Contact</p>
                <p className="text-sm text-muted-foreground">
                  {appointment.contact_identifier || 'No contact specified'}
                </p>
              </div>
            </div>
            {appointment.source_channel && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Source Channel</p>
                  <p className="text-sm text-muted-foreground">
                    {appointment.source_channel}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Additional Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium mb-2">Notes</p>
              <div className="bg-muted/50 rounded-lg p-3 min-h-[100px]">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {appointment.notes || 'No notes provided'}
                </p>
              </div>
            </div>
            <div className="pt-4 border-t">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">Created</p>
                  <p>{formatDateTime(appointment.created_at)}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Last Updated</p>
                  <p>{formatDateTime(appointment.updated_at)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
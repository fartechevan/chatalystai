import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, Calendar, Clock, Plus, Edit, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  appointments: Appointment[];
}

interface AppointmentsCalendarProps {
  onGoToTodayRef?: React.MutableRefObject<(() => void) | null>;
}

export function AppointmentsCalendar({ onGoToTodayRef }: AppointmentsCalendarProps = {}) {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const { toast } = useToast();

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('start_time', { ascending: true });

      if (error) throw error;
      
      setAppointments(data || []);
    } catch (error: unknown) {
      console.error("Error fetching appointments:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({
        title: "Error",
        description: `Failed to fetch appointments: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const getCalendarDays = (): CalendarDay[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dayAppointments = appointments.filter(appointment => {
        const appointmentDate = new Date(appointment.start_time);
        return appointmentDate.toDateString() === date.toDateString();
      });
      
      days.push({
        date,
        isCurrentMonth: date.getMonth() === month,
        isToday: date.toDateString() === today.toDateString(),
        appointments: dayAppointments
      });
    }
    
    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // Expose goToToday function to parent component
  useEffect(() => {
    if (onGoToTodayRef) {
      onGoToTodayRef.current = goToToday;
    }
  }, [onGoToTodayRef, goToToday]);

  const formatTime = (dateTime: string) => {
    const date = new Date(dateTime);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

  const calendarDays = getCalendarDays();
  const selectedDayAppointments = selectedDate 
    ? appointments.filter(appointment => {
        const appointmentDate = new Date(appointment.start_time);
        return appointmentDate.toDateString() === selectedDate.toDateString();
      })
    : [];

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex flex-col lg:flex-row h-full p-4 gap-4">
      {/* Calendar View */}
      <div className="flex-1 min-w-0">
        <Card className="h-full">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={goToToday}>
                  Today
                </Button>
                <Button variant="outline" size="icon" onClick={() => navigateMonth('prev')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => navigateMonth('next')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-7 border-b">
              {dayNames.map(day => (
                <div key={day} className="p-3 text-center text-sm font-medium text-muted-foreground border-r last:border-r-0">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 h-[400px] lg:h-[500px]">
              {calendarDays.map((day, index) => (
                <div
                  key={index}
                  className={`border-r border-b last:border-r-0 p-2 cursor-pointer hover:bg-muted/50 transition-colors ${
                    !day.isCurrentMonth ? 'text-muted-foreground bg-muted/20' : ''
                  } ${
                    day.isToday ? 'bg-primary/10' : ''
                  } ${
                    selectedDate?.toDateString() === day.date.toDateString() ? 'bg-primary/20' : ''
                  }`}
                  onClick={() => setSelectedDate(day.date)}
                >
                  <div className="flex flex-col h-full">
                    <div className={`text-sm font-medium mb-1 ${
                      day.isToday ? 'text-primary font-bold' : ''
                    }`}>
                      {day.date.getDate()}
                    </div>
                    <div className="flex-1 space-y-1 overflow-hidden">
                      {day.appointments.slice(0, 3).map((appointment, idx) => (
                        <div
                          key={appointment.id}
                          className="text-xs p-1 rounded bg-primary/10 text-primary truncate"
                          title={appointment.title}
                        >
                          {appointment.title || 'Untitled'}
                        </div>
                      ))}
                      {day.appointments.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{day.appointments.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selected Day Details */}
      <div className="w-full lg:w-80 flex-shrink-0">
        <Card className="h-full">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {selectedDate ? selectedDate.toLocaleDateString() : 'Select a date'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {selectedDate ? (
              <ScrollArea className="h-[400px] lg:h-[500px] px-6">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading appointments...
                  </div>
                ) : selectedDayAppointments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No appointments for this day</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-4"
                      onClick={() => navigate('/dashboard/leads/appointments/new')}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Appointment
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 pb-6">
                    {selectedDayAppointments.map((appointment) => (
                      <div key={appointment.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <h4 className="font-medium text-sm">
                            {appointment.title || 'Untitled'}
                          </h4>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/dashboard/leads/appointments/view/${appointment.id}`)}
                              className="h-6 w-6 p-0"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/dashboard/leads/appointments/edit/${appointment.id}`)}
                              className="h-6 w-6 p-0"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Badge variant={getStatusBadgeVariant(appointment.status)} className="text-xs">
                              {appointment.status || 'pending'}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatTime(appointment.start_time)}
                          {appointment.end_time && (
                            <span> - {formatTime(appointment.end_time)}</span>
                          )}
                        </div>
                        {appointment.contact_identifier && (
                          <div className="text-xs text-muted-foreground">
                            Contact: {appointment.contact_identifier}
                          </div>
                        )}
                        {appointment.source_channel && (
                          <div className="text-xs text-muted-foreground">
                            Channel: {appointment.source_channel}
                          </div>
                        )}
                        {appointment.notes && (
                          <div className="text-xs text-muted-foreground">
                            Notes: {appointment.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground px-6">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Click on a date to view appointments</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
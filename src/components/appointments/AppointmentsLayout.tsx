import React, { useState, useEffect, useRef } from "react";
import { useOutletContext, useNavigate } from 'react-router-dom';
import { AppointmentsContent } from "./AppointmentsContent";
import { Button } from "@/components/ui/button";
import { Calendar, Plus } from "lucide-react";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { PageHeaderContextType } from '@/components/dashboard/DashboardLayout';

export function AppointmentsLayout() {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<'list' | 'calendar'>('list');
  const goToTodayRef = useRef<(() => void) | null>(null);

  const outletContext = useOutletContext<PageHeaderContextType | undefined>();

  useEffect(() => {
    if (outletContext?.setHeaderActions) {
      const actions = [
        <Button
          key="list-view"
          variant={currentView === 'list' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCurrentView('list')}
          className="h-8"
        >
          List View
        </Button>,
        <Button
          key="calendar-view"
          variant={currentView === 'calendar' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCurrentView('calendar')}
          className="h-8"
        >
          <Calendar className="h-4 w-4 mr-2" />
          Calendar View
        </Button>
      ];

      // Add Today button only when in calendar view
      if (currentView === 'calendar') {
        actions.push(
          <Button
            key="today"
            variant="outline"
            size="sm"
            onClick={() => goToTodayRef.current?.()}
            className="h-8"
          >
            Today
          </Button>
        );
      }

      actions.push(
        <Button
          key="new-appointment"
          onClick={() => navigate('/dashboard/leads/appointments/new')}
          size="sm"
          className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Appointment
        </Button>
      );

      outletContext.setHeaderActions(actions);
    }

    return () => {
      if (outletContext?.setHeaderActions) {
        outletContext.setHeaderActions([]);
      }
    };
  }, [outletContext, currentView, navigate]);

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col">
        <AppointmentsContent currentView={currentView} onGoToTodayRef={goToTodayRef} />
      </div>
    </div>
  );
}
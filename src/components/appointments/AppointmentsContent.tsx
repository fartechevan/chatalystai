import React from "react";
import { AppointmentsList } from "./AppointmentsList";
import { AppointmentsCalendar } from "./AppointmentsCalendar";

interface AppointmentsContentProps {
  currentView: 'list' | 'calendar';
  onGoToTodayRef?: React.MutableRefObject<(() => void) | null>;
}

export function AppointmentsContent({ currentView, onGoToTodayRef }: AppointmentsContentProps) {
  return (
    <div className="flex-1 flex flex-col h-full">
      {currentView === 'list' ? (
        <AppointmentsList />
      ) : (
        <AppointmentsCalendar onGoToTodayRef={onGoToTodayRef} />
      )}
    </div>
  );
}
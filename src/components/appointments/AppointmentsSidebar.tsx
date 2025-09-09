import React from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Clock } from "lucide-react";

interface AppointmentsSidebarProps {
  currentView: 'list' | 'calendar';
  onViewSelect: (view: 'list' | 'calendar') => void;
}

export function AppointmentsSidebar({ currentView, onViewSelect }: AppointmentsSidebarProps) {
  return null;
}
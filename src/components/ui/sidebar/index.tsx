
import { SidebarBase } from "./SidebarBase"
import { SidebarProvider, useSidebar } from "./SidebarContext"
import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInput,
  SidebarMenuButton,
  SidebarSeparator,
} from "./SidebarComponents"

// New imports for the structured menu
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "./SidebarMenu"

export {
  SidebarBase as Sidebar,
  SidebarProvider,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInput,
  SidebarMenuButton,
  SidebarSeparator,
  useSidebar,
  // Export the new structured menu components
  SidebarMenu,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
}

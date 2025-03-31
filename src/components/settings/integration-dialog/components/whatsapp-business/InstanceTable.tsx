
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logoutWhatsAppInstance } from "../../hooks/whatsapp/services/logoutService";
import type { DisplayInstance } from "../WhatsAppBusinessSettings";

interface InstanceTableProps {
  instanceDetails: DisplayInstance;
  onConnect: () => void;
  isLogoutLoading: string | null;
  setIsLogoutLoading: (value: string | null) => void;
}

export function InstanceTable({ 
  instanceDetails, 
  onConnect, 
  isLogoutLoading, 
  setIsLogoutLoading 
}: InstanceTableProps) {
  const toastUtils = useToast();
  const { toast } = toastUtils;

  const handleLogout = async (instanceName: string) => {
    if (!instanceName) return;

    setIsLogoutLoading(instanceName);

    try {
      const success = await logoutWhatsAppInstance(
        instanceName,
        () => {
          toast({ title: "Disconnected", description: `Instance ${instanceName} disconnected.` });
        },
        { toast: toastUtils }
      );

      if (success === false) {
        console.error(`Failed to logout WhatsApp instance ${instanceName}`);
      }
    } catch (error) {
      console.error(`Error logging out instance ${instanceName}:`, error);
      toast({
        title: "Logout Error",
        description: `Failed to disconnect instance ${instanceName}: ${(error as Error).message}`,
        variant: "destructive"
      });
    } finally {
      setIsLogoutLoading(null);
    }
  };

  const getStatusIcon = (details: DisplayInstance | null) => {
    return isConnected(details)
      ? <span className="h-2 w-2 rounded-full bg-green-500" />
      : <span className="h-2 w-2 rounded-full bg-amber-500" />;
  };

  const isConnected = (details: DisplayInstance | null) => {
    return details?.connectionStatus === 'open';
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Pipeline</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow key={instanceDetails.id}>
          <TableCell className="font-medium">{instanceDetails.profileName || instanceDetails.name}</TableCell>
          <TableCell>
            <select className="border rounded-md px-2 py-1">
              <option>Default Pipeline</option>
            </select>
          </TableCell>
          <TableCell>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(instanceDetails)}
                <span className="text-sm">
                  {isConnected(instanceDetails) ? "Connected" : "Disconnected"}
                </span>
              </div>
              {isConnected(instanceDetails) ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => handleLogout(instanceDetails.name)}
                  disabled={isLogoutLoading === instanceDetails.name}
                  title="Disconnect"
                >
                  {isLogoutLoading === instanceDetails.name ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4 text-gray-400 hover:text-red-500" />
                  )}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={onConnect}
                  title="Attempt Reconnect"
                >
                  Connect
                </Button>
              )}
            </div>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

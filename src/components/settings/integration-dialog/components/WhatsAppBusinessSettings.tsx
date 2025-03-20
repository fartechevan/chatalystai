
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { CheckCircle, Plus, AlertCircle, X } from "lucide-react";

export function WhatsAppBusinessSettings() {
  return (
    <ScrollArea className="h-full">
      <div className="space-y-4">
        <div className="space-y-4 mt-6">
          <h3 className="text-lg font-semibold">Backup number</h3>
          <p className="text-gray-500">
            This WhatsApp account will be used in case your other numbers get disconnected.
          </p>
          <div className="bg-gray-100 p-4 rounded-md">
            <p className="text-gray-600">+60 17-516 8607</p>
          </div>
        </div>
        
        <div className="mt-8">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Number</TableHead>
                <TableHead>Pipeline</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">+60 17-516 8607</TableCell>
                <TableCell>+60 17-516 8607</TableCell>
                <TableCell>
                  <select className="border rounded-md px-2 py-1">
                    <option>Pipeline</option>
                    <option>Prospects</option>
                    <option>Customers</option>
                    <option>Leads</option>
                  </select>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-between">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <X className="h-4 w-4 text-gray-400" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          
          <Button className="mt-4" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add number
          </Button>
        </div>
        
        <div className="mt-8 p-4 bg-amber-50 rounded-lg border border-amber-100">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-800">
                Don't forget to use your phone at least <strong>once every 14 days</strong> to stay connected.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Vendor() {
  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Vendor Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Welcome to the vendor dashboard</p>
        </CardContent>
      </Card>
    </div>
  );
}
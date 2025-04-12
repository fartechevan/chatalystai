import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tables } from "@/integrations/supabase/types";
import { User } from "lucide-react"; // Import an icon

// Define the type for a single user based on the query in SettingsContent.tsx
type Profile = Pick<Tables<'profiles'>, 'id' | 'email' | 'name' | 'created_at' | 'role'>;

interface UserCardListProps {
  users: Profile[];
}

export function UserCardList({ users }: UserCardListProps) {
  if (!users || users.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border rounded-md">
        No users found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {users.map((user) => {
        const role = user.role || 'user'; // Default to 'user' if role is null/undefined
        return (
          <Card key={user.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">{user.name || 'No Name'}</CardTitle>
              <User className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-sm text-muted-foreground">
                {user.email || 'No Email'}
              </div>
              <div className="flex items-center pt-1">
                <span className="text-xs text-muted-foreground mr-2">Role:</span>
                <Badge variant={role === 'admin' ? 'default' : 'secondary'}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Badge>
              </div>
               {/* Optionally display created_at or other relevant info */}
               {/* <div className="text-xs text-muted-foreground pt-1">
                 Joined: {new Date(user.created_at).toLocaleDateString()}
               </div> */}
            </CardContent>
            {/* Add actions here if needed in the future, e.g., Edit/Delete buttons */}
            {/* <CardFooter>
              <Button size="sm" variant="outline">View Details</Button>
            </CardFooter> */}
          </Card>
        );
      })}
    </div>
  );
}

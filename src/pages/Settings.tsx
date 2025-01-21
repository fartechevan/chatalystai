import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Settings = () => {
  const [loading, setLoading] = useState(false);

  const createTestUser = async () => {
    setLoading(true);
    try {
      const testUser = {
        email: 'test@example.com',
        password: 'test123456',
        options: {
          data: {
            name: 'Test User',
          },
        },
      };

      console.log('Creating test user with:', testUser);

      const { data, error } = await supabase.auth.signUp(testUser);

      if (error) throw error;

      console.log('User created successfully:', data);
      
      toast({
        title: "Success",
        description: `Test user created! Email: ${testUser.email}, Password: ${testUser.password}`,
      });
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Test User</CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={createTestUser}
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Test User"}
          </Button>
          <div className="mt-4 text-sm text-muted-foreground">
            This will create a test user with:<br />
            Email: test@example.com<br />
            Password: test123456
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
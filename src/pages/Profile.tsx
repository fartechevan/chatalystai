
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  role?: string;
}

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      
      // Fetch the user profile data from the profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
      
      if (error) {
        throw error;
      }
      
      if (data) {
        setProfile(data as UserProfile);
        setFormData({
          name: data.name || "",
          email: user?.email || "",
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      // Update the profile in the database
      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
        })
        .eq('id', user?.id);
        
      if (error) {
        throw error;
      }
      
      // Update the email (if changed) in auth
      if (formData.email !== user?.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: formData.email,
        });
        
        if (emailError) {
          throw emailError;
        }
      }
      
      // Refresh the profile data
      await fetchUserProfile();
      
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    const names = name.split(" ");
    return names.length > 1
      ? `${names[0][0]}${names[1][0]}`.toUpperCase()
      : name[0].toUpperCase();
  };

  if (isLoading && !profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>
      
      <Card>
        <div className="flex flex-col md:flex-row">
          {/* Left Column */}
          <div className="md:w-1/3 p-6 border-b md:border-b-0 md:border-r">
            <CardHeader className="p-0 mb-4">
              <div className="flex flex-col items-center text-center md:items-start md:text-left gap-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback>{profile ? getInitials(profile.name) : "U"}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle>{profile?.name || "User"}</CardTitle>
                  <CardDescription>{profile?.email || user?.email}</CardDescription>
                  {profile?.role && (
                    <span className="inline-block mt-2 text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                      {profile.role}
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            {/* You can add more static info here if needed */}
          </div>

          {/* Right Column */}
          <div className="md:w-2/3 p-6">
            <CardContent className="p-0 space-y-4">
              {isEditing ? (
                <>
                  <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name"
                  name="name"
                  value={formData.name} 
                  onChange={handleChange}
                  placeholder="Enter your full name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email} 
                  onChange={handleChange}
                  placeholder="Enter your email address"
                />
                <p className="text-xs text-muted-foreground">
                  Changing your email will require verification.
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Full Name</h3>
                <p>{profile?.name || "Not set"}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Email Address</h3>
                <p>{profile?.email || user?.email}</p>
              </div>
            </div>
          )}
            </CardContent> {/* Close CardContent here */}
            
            <CardFooter className="p-0 pt-6 flex justify-end space-x-2"> {/* Adjust padding and add pt-6 */}
              {isEditing ? (
                <>
                  <Button 
                variant="outline" 
                onClick={() => {
                  setIsEditing(false);
                  // Reset form data to current profile
                  setFormData({
                    name: profile?.name || "",
                    email: profile?.email || user?.email || "",
                  });
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
                Save Changes
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              Edit Profile
                </Button>
              )}
            </CardFooter>
          </div> {/* Close Right Column div */}
        </div> {/* Close flex container div */}
      </Card>
    </div>
  );
}

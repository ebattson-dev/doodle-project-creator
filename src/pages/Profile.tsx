import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Save, Bell } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { pushNotificationService } from "@/services/pushNotificationService";
import { Capacitor } from "@capacitor/core";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  age: z.number().min(13, "Must be at least 13 years old").max(120, "Invalid age").optional(),
  gender: z.string().optional(),
  life_stage: z.string().optional(),
  job_title: z.string().max(100, "Job title must be less than 100 characters").optional(),
  current_level: z.string().optional(),
  goals: z.string().max(500, "Goals must be less than 500 characters").optional(),
  rep_style: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  age?: number;
  gender?: string;
  life_stage?: string;
  job_title?: string;
  focus_areas: string[];
  current_level?: string;
  goals?: string;
  rep_style?: string;
  profile_picture?: string;
  push_enabled?: boolean;
}

interface FocusArea {
  id: string;
  title: string;
  description?: string;
}

const Profile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [focusAreas, setFocusAreas] = useState<FocusArea[]>([]);
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      email: "",
      age: undefined,
      gender: "",
      life_stage: "",
      job_title: "",
      current_level: "",
      goals: "",
      rep_style: "",
    },
  });

  useEffect(() => {
    fetchProfile();
    fetchFocusAreas();
  }, []);

  // Separate useEffect to populate form when profile data loads
  useEffect(() => {
    if (profile) {
      const formData = {
        name: profile.full_name || "",
        email: profile.email || "",
        age: profile.age || undefined,
        gender: profile.gender || "",
        life_stage: profile.life_stage || "",
        job_title: profile.job_title || "",
        current_level: profile.current_level || "",
        goals: profile.goals || "",
        rep_style: profile.rep_style || "",
      };
      console.log("Populating form with profile data:", formData);
      form.reset(formData);
    }
  }, [profile, form]);

  const fetchProfile = async () => {
    try {
      console.log("Fetching profile data...");
      const { data: { user } } = await supabase.auth.getUser();
      console.log("Current user:", user?.id);
      
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to view your profile",
          variant: "destructive",
        });
        return;
      }

      // Force fresh data fetch by disabling cache
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Profile fetch error:", error);
        toast({
          title: "Error",
          description: "Failed to load profile",
          variant: "destructive",
        });
        return;
      }

      console.log("Profile data received:", data);

      if (data) {
        setProfile(data);
        // Parse focus_areas array from profiles table
        const focusAreasArray = data.focus_areas || [];
        console.log("Focus areas from profile:", focusAreasArray);
        
        // Fetch focus area IDs from titles
        if (focusAreasArray.length > 0) {
          const { data: focusAreasData } = await supabase
            .from("focus_areas")
            .select("id, title")
            .in("title", focusAreasArray);
          
          console.log("Focus areas data fetched:", focusAreasData);
          if (focusAreasData) {
            setSelectedFocusAreas(focusAreasData.map(fa => fa.id));
          }
        }
        
        setPushEnabled(data.push_enabled || false);
        
        // Don't reset form here - let the useEffect handle it
        console.log("Profile state updated, form will be populated by useEffect");
      } else {
        console.log("No profile data found for user");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFocusAreas = async () => {
    try {
      const { data, error } = await supabase
        .from("focus_areas")
        .select("*")
        .order("title");

      if (error) {
        console.error("Error fetching focus areas:", error);
        return;
      }

      setFocusAreas(data || []);
    } catch (error) {
      console.error("Error fetching focus areas:", error);
    }
  };

  const handleFocusAreaToggle = (focusAreaId: string) => {
    setSelectedFocusAreas(prev => 
      prev.includes(focusAreaId)
        ? prev.filter(id => id !== focusAreaId)
        : [...prev, focusAreaId]
    );
  };

  const onSubmit = async (data: ProfileFormData) => {
    console.log("=== PROFILE UPDATE STARTED ===");
    console.log("Form data submitted:", data);
    console.log("Selected focus areas:", selectedFocusAreas);
    
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log("User ID:", user?.id);
      
      if (!user) {
        console.error("No user found!");
        toast({
          title: "Authentication Required",
          description: "Please log in to update your profile",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      // Get focus area titles from selected IDs
      console.log("Fetching focus area titles for IDs:", selectedFocusAreas);
      const { data: focusAreasData, error: focusError } = await supabase
        .from("focus_areas")
        .select("title")
        .in("id", selectedFocusAreas);
      
      if (focusError) {
        console.error("Focus areas fetch error:", focusError);
      }
      
      const focusAreaTitles = focusAreasData?.map(fa => fa.title) || [];
      console.log("Focus area titles:", focusAreaTitles);

      const updateData = {
        full_name: data.name,
        email: data.email,
        age: data.age || null,
        gender: data.gender || null,
        life_stage: data.life_stage || null,
        job_title: data.job_title || null,
        current_level: data.current_level || null,
        goals: data.goals || null,
        rep_style: data.rep_style || null,
        focus_areas: focusAreaTitles,
        updated_at: new Date().toISOString(),
      };

      console.log("=== ATTEMPTING DATABASE UPDATE ===");
      console.log("Update data:", JSON.stringify(updateData, null, 2));
      
      const { data: updateResult, error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("user_id", user.id)
        .select();

      console.log("Update result:", updateResult);
      console.log("Update error:", error);

      if (error) {
        console.error("=== PROFILE UPDATE FAILED ===");
        console.error("Error details:", JSON.stringify(error, null, 2));
        toast({
          title: "Error",
          description: `Failed to update profile: ${error.message}`,
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      console.log("=== PROFILE UPDATE SUCCESSFUL ===");
      
      toast({
        title: "Success",
        description: "Profile updated successfully! Redirecting...",
      });
      
      // Navigate back to dashboard after successful update
      setTimeout(() => {
        console.log("Navigating to dashboard...");
        navigate("/dashboard");
      }, 1500);
    } catch (error) {
      console.error("=== UNEXPECTED ERROR ===");
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
      setIsSaving(false);
    }
  };

  const handlePushToggle = async (enabled: boolean) => {
    if (!Capacitor.isNativePlatform()) {
      toast({
        title: "Not Available",
        description: "Push notifications are only available on mobile apps",
        variant: "destructive",
      });
      return;
    }

    try {
      if (enabled) {
        const success = await pushNotificationService.enableNotifications();
        if (success) {
          setPushEnabled(true);
          toast({
            title: "Notifications Enabled",
            description: "You'll now receive daily rep notifications",
          });
        } else {
          toast({
            title: "Permission Denied",
            description: "Please enable notifications in your device settings",
            variant: "destructive",
          });
        }
      } else {
        await pushNotificationService.disableNotifications();
        setPushEnabled(false);
        toast({
          title: "Notifications Disabled",
          description: "You won't receive daily rep notifications",
        });
      }
    } catch (error) {
      console.error("Error toggling push notifications:", error);
      toast({
        title: "Error",
        description: "Failed to update notification settings",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Profile</h1>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          {/* Profile Picture Section */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
              <CardDescription>Update your profile picture</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile?.profile_picture} />
                <AvatarFallback className="text-lg">
                  {profile?.full_name?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <Button variant="outline" size="sm">
                <Camera className="h-4 w-4 mr-2" />
                Change Photo
              </Button>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your information and preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="age"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Age</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              value={field.value || ""} 
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="life_stage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Life Stage</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select life stage" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Student">Student</SelectItem>
                              <SelectItem value="Early Career">Early Career</SelectItem>
                              <SelectItem value="Mid-Career">Mid-Career</SelectItem>
                              <SelectItem value="Retired">Retired</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="job_title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job Title</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. Software Engineer" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="current_level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Level</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select your level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Beginner">Beginner</SelectItem>
                              <SelectItem value="Intermediate">Intermediate</SelectItem>
                              <SelectItem value="Advanced/Pro">Advanced/Pro</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="rep_style"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rep Style</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select rep style" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Quick [5–10 min]">Quick (5-10 min)</SelectItem>
                              <SelectItem value="Moderate [10–15 min]">Moderate (10-15 min)</SelectItem>
                              <SelectItem value="Long [15–30 min]">Long (15-30 min)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="goals"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Goals</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Describe your personal goals and what you want to achieve"
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Focus Areas Section */}
                  <div className="space-y-4">
                    <div>
                      <Label className="text-base font-semibold">Focus Areas</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Select the areas you want to focus on for your daily reps
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {focusAreas.map((area) => (
                        <div key={area.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={area.id}
                            checked={selectedFocusAreas.includes(area.id)}
                            onCheckedChange={() => handleFocusAreaToggle(area.id)}
                          />
                          <Label 
                            htmlFor={area.id} 
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {area.title}
                          </Label>
                        </div>
                      ))}
                    </div>
                    
                    {selectedFocusAreas.length > 0 && (
                      <div className="mt-4">
                        <Label className="text-sm font-medium">Selected Focus Areas:</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedFocusAreas.map((areaId) => {
                            const area = focusAreas.find(a => a.id === areaId);
                            return area ? (
                              <Badge key={areaId} variant="secondary">
                                {area.title}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Push Notifications */}
                  {Capacitor.isNativePlatform() && (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-base font-semibold flex items-center gap-2">
                          <Bell className="h-4 w-4" />
                          Push Notifications
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Get notified when your daily rep is ready
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="push-notifications">Enable Daily Notifications</Label>
                          <p className="text-sm text-muted-foreground">
                            Receive a notification each day when your new rep is generated
                          </p>
                        </div>
                        <Switch
                          id="push-notifications"
                          checked={pushEnabled}
                          onCheckedChange={handlePushToggle}
                        />
                      </div>
                    </div>
                  )}

                  {/* Save Button */}
                  <div className="flex justify-end pt-4">
                    <Button 
                      type="submit"
                      disabled={isSaving}
                      size="lg"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? "Saving..." : "Save Profile"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;

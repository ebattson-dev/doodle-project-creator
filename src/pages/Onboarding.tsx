import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface FocusArea {
  id: string;
  title: string;
  description: string;
}

const userProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  age: z.number().min(13, "Must be at least 13 years old").max(120, "Invalid age").optional(),
  gender: z.string().optional(),
  lifeStage: z.string().optional(),
  jobTitle: z.string().max(100, "Job title must be less than 100 characters").optional(),
  focusAreas: z.array(z.string()).default([]),
  currentLevel: z.string().optional(),
  goals: z.string().max(1000, "Goals must be less than 1000 characters").optional(),
  repStyle: z.string().optional(),
  profilePicture: z.instanceof(File).optional(),
});

type UserProfileForm = z.infer<typeof userProfileSchema>;

export default function Onboarding() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusAreas, setFocusAreas] = useState<FocusArea[]>([]);
  const [isLoadingFocusAreas, setIsLoadingFocusAreas] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<UserProfileForm>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: {
      focusAreas: [],
    },
  });

  useEffect(() => {
    const fetchFocusAreas = async () => {
      try {
        const { data, error } = await supabase
          .from('focus_areas')
          .select('id, title, description')
          .order('title');

        if (error) throw error;
        setFocusAreas(data || []);
      } catch (error) {
        console.error('Error fetching focus areas:', error);
        toast({
          title: "Error",
          description: "Failed to load focus areas. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingFocusAreas(false);
      }
    };

    // Check if user already has a profile
    const checkExistingProfile = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return;

        const { data } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (data) {
          // User already has a profile, redirect to dashboard
          navigate("/dashboard", { replace: true });
          return;
        }
      } catch (error) {
        console.error('Error checking existing profile:', error);
      }
    };

    fetchFocusAreas();
    checkExistingProfile();
  }, [toast, navigate]);

  const uploadProfilePicture = async (file: File, userId: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/profile.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('profile-pictures')
      .upload(fileName, file, { upsert: true });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const onSubmit = async (data: UserProfileForm) => {
    try {
      setIsSubmitting(true);

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        toast({
          title: "Authentication Error",
          description: "Please log in to continue.",
          variant: "destructive",
        });
        return;
      }

      let profilePictureUrl = null;
      if (data.profilePicture) {
        profilePictureUrl = await uploadProfilePicture(data.profilePicture, user.id);
      }

      // Insert user profile
      const { error } = await supabase
        .from('user_profiles')
        .insert({
          user_id: user.id,
          name: data.name,
          email: data.email,
          age: data.age,
          gender: data.gender,
          life_stage: data.lifeStage,
          job_title: data.jobTitle,
          focus_area_ids: data.focusAreas,
          current_level: data.currentLevel,
          goals: data.goals,
          rep_style: data.repStyle,
          profile_picture_url: profilePictureUrl,
        });

      if (error) throw error;

      toast({
        title: "Profile Created",
        description: "Your profile has been successfully created!",
      });

      navigate("/dashboard");
    } catch (error) {
      console.error("Error creating profile:", error);
      toast({
        title: "Error",
        description: "Failed to create profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold mb-4">
              Welcome to The Daily Rep 👊
            </CardTitle>
            <CardDescription className="text-lg leading-relaxed mb-6">
              This is your personal growth companion, built to help you get better every day in the areas that matter most to YOU.
              <br /><br />
              Answer these quick questions so we can customize your experience and deliver real value straight to you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your full name" {...field} />
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
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter your email" {...field} />
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
                          type="number" 
                          placeholder="Enter your age" 
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="non-binary">Non-binary</SelectItem>
                          <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lifeStage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Life Stage</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select life stage" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="early-career">Early Career</SelectItem>
                          <SelectItem value="mid-career">Mid Career</SelectItem>
                          <SelectItem value="senior-career">Senior Career</SelectItem>
                          <SelectItem value="retired">Retired</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="jobTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your job title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="focusAreas"
                  render={() => (
                    <FormItem>
                      <FormLabel>Focus Areas</FormLabel>
                      <div className="grid grid-cols-2 gap-2">
                        {focusAreas.map((area) => (
                          <FormField
                            key={area.id}
                            control={form.control}
                            name="focusAreas"
                            render={({ field }) => {
                              return (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(area.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, area.id])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== area.id
                                              )
                                            )
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-sm font-normal">
                                    {area.title}
                                  </FormLabel>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currentLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Level</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                          <SelectItem value="expert">Expert</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="goals"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Goals</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Tell us about your goals..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="repStyle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Rep Style</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select rep style" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="quick">Quick (5-10 min)</SelectItem>
                          <SelectItem value="moderate">Moderate (15-30 min)</SelectItem>
                          <SelectItem value="intensive">Intensive (30+ min)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="profilePicture"
                  render={({ field: { onChange, value, ...field } }) => (
                    <FormItem>
                      <FormLabel>Profile Picture</FormLabel>
                      <FormControl>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => onChange(e.target.files?.[0])}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Creating Profile..." : "Complete Setup"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
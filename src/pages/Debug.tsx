import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function Debug() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { toast } = useToast();

  const createTestProfile = async () => {
    try {
      setIsCreating(true);
      setError(null);
      setSuccess(null);

      // Step 1: Get current logged-in user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        setError("NO_AUTH");
        return;
      }

      // Step 2: Insert test profile record
      const testProfileData = {
        user_id: user.id,
        full_name: "TEST PROFILE",
        email: user.email || "test@example.com",
        age: 30,
        gender: "Male",
        life_stage: "Early Career",
        job_title: "Tester",
        focus_areas: ["Mindset"],
        current_level: "Beginner",
        goals: "Test profile creation",
        rep_style: "Quick [5–10 min]"
      };

      const { data, error: insertError } = await supabase
        .from('profiles')
        .insert(testProfileData)
        .select('id')
        .single();

      if (insertError) {
        setError(`Database Error: ${insertError.message} (Code: ${insertError.code})`);
        return;
      }

      // Step 3: Success response
      const successResponse = {
        status: "OK",
        id: data.id
      };
      
      setSuccess(JSON.stringify(successResponse, null, 2));
      
      toast({
        title: "Test Profile Created",
        description: `New record ID: ${data.id}`,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setError(`Unexpected Error: ${errorMessage}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-4xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Debug — Profile Save Test</CardTitle>
            <CardDescription>
              Test profile creation workflow with detailed error reporting
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={createTestProfile} 
              disabled={isCreating}
              className="w-full"
            >
              {isCreating ? "Creating Test Profile..." : "Create Test Profile"}
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>
                  <strong>Error:</strong> {error}
                </AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert>
                <AlertDescription>
                  <strong>Success:</strong>
                  <pre className="mt-2 whitespace-pre-wrap font-mono text-sm">
                    {success}
                  </pre>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workflow Steps</CardTitle>
            <CardDescription>
              create_test_profile workflow implementation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 font-mono text-sm">
              <div>
                <strong>Step 1:</strong> Collect current logged-in user id and email
                <ul className="ml-4 mt-1 list-disc space-y-1">
                  <li>Call: supabase.auth.getUser()</li>
                  <li>Extract: user.id and user.email</li>
                  <li>If no auth user: return error "NO_AUTH"</li>
                </ul>
              </div>

              <div>
                <strong>Step 2:</strong> Insert record into Profiles collection
                <ul className="ml-4 mt-1 list-disc space-y-1">
                  <li>user_id = current auth user id</li>
                  <li>full_name = "TEST PROFILE"</li>
                  <li>email = current user email or "test@example.com"</li>
                  <li>age = 30</li>
                  <li>gender = "Male"</li>
                  <li>life_stage = "Early Career"</li>
                  <li>job_title = "Tester"</li>
                  <li>focus_areas = ["Mindset"]</li>
                  <li>current_level = "Beginner"</li>
                  <li>goals = "Test profile creation"</li>
                  <li>rep_style = "Quick [5–10 min]"</li>
                </ul>
              </div>

              <div>
                <strong>Step 3:</strong> Handle response
                <ul className="ml-4 mt-1 list-disc space-y-1">
                  <li>Success: Return JSON &#123; status: "OK", id: &lt;new_record_id&gt; &#125;</li>
                  <li>Success: Show success toast with record ID</li>
                  <li>Error: Return exact backend error message</li>
                  <li>Error: Show error in visible error box</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
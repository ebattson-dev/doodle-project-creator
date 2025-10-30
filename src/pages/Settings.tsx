import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Bell, Clock, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { webPushService } from "@/services/webPushService";

export default function Settings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [deliveryHour, setDeliveryHour] = useState("12");
  const [timezone, setTimezone] = useState("America/New_York");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('auto_generate_reps, preferred_delivery_time')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (profile) {
        setAutoGenerate(profile.auto_generate_reps || false);
        
        // Parse the time (format: HH:MM:SS)
        if (profile.preferred_delivery_time) {
          const hour = profile.preferred_delivery_time.split(':')[0];
          setDeliveryHour(hour);
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Convert hour to UTC time
      const selectedTime = `${deliveryHour.padStart(2, '0')}:00:00`;

      const { error } = await supabase
        .from('profiles')
        .update({
          auto_generate_reps: autoGenerate,
          preferred_delivery_time: selectedTime,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: autoGenerate 
          ? `Your daily rep will be automatically generated at ${deliveryHour}:00 ${timezone.split('/')[1]} time`
          : "Automatic generation has been disabled",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      setSendingTest(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use web push for PWA (browser-based push notifications)
      const functionName = 'send-web-push';

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          userId: user.id,
          title: '🏋️ Test Daily Rep Notification',
          body: 'This is a test notification! If you see this, notifications are working perfectly.',
          data: {
            test: true
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Test Notification Sent",
        description: data?.success 
          ? "Check your device for the notification!" 
          : "Push notifications may not be enabled. Make sure you've granted permission on your device.",
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        title: "Error",
        description: "Failed to send test notification. Make sure push notifications are enabled.",
        variant: "destructive",
      });
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Manage your daily rep preferences</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Automatic Daily Rep Generation
            </CardTitle>
            <CardDescription>
              Get your daily rep automatically generated and sent to you via push notification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-generate">Enable Automatic Generation</Label>
                <p className="text-sm text-muted-foreground">
                  Your daily rep will be generated automatically at your preferred time
                </p>
              </div>
              <Switch
                id="auto-generate"
                checked={autoGenerate}
                onCheckedChange={setAutoGenerate}
              />
            </div>

            {autoGenerate && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="delivery-time" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Delivery Time
                  </Label>
                  <Select value={deliveryHour} onValueChange={setDeliveryHour}>
                    <SelectTrigger id="delivery-time">
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => i).map((hour) => {
                        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                        const period = hour < 12 ? 'AM' : 'PM';
                        return (
                          <SelectItem key={hour} value={String(hour)}>
                            {displayHour}:00 {period}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Time shown in {timezone.split('/')[1]} timezone
                  </p>
                </div>

                <div className="rounded-lg bg-muted p-4">
                  <h4 className="font-medium mb-2">📱 Push Notifications Required</h4>
                  <p className="text-sm text-muted-foreground">
                    To receive your daily rep automatically, make sure push notifications are enabled on the Dashboard.
                    The rep will be delivered directly to your device at your selected time!
                  </p>
                </div>
              </>
            )}

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full"
            >
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Test Notifications
            </CardTitle>
            <CardDescription>
              Send a test notification to your device to make sure everything is working
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleTestNotification}
              disabled={sendingTest}
              variant="outline"
              className="w-full"
            >
              {sendingTest ? "Sending..." : "Send Test Notification"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">🤖 Automatic Generation</h4>
              <p className="text-sm text-muted-foreground">
                When enabled, a personalized rep will be generated for you daily at your selected time
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">🔔 Push Notifications</h4>
              <p className="text-sm text-muted-foreground">
                You'll receive a notification with your rep details - read it right from the notification without opening the app
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">⚡ Manual Generation</h4>
              <p className="text-sm text-muted-foreground">
                You can still generate reps manually anytime from the Dashboard
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
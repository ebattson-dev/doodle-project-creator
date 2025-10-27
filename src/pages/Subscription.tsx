import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SUBSCRIPTION_PLANS = {
  monthly: {
    priceId: 'price_1SMhX8AXip9lIK439tcbYygK',
    productId: 'prod_TJKB1fCCSOwa7R',
    name: 'Monthly',
    price: '$9.99',
    interval: 'month',
  },
  annual: {
    priceId: 'price_1SMhXQAXip9lIK439NTwV0I7',
    productId: 'prod_TJKB4C3PAvs7Wf',
    name: 'Annual',
    price: '$79.99',
    interval: 'year',
    savings: 'Save 33%',
  },
};

export default function Subscription() {
  const { subscription, session, checkSubscription } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubscribe = async (priceId: string, planName: string) => {
    if (!session) {
      toast.error("Please sign in to subscribe");
      navigate("/auth");
      return;
    }

    setLoading(priceId);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
        toast.success(`Opening checkout for ${planName} plan...`);
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    if (!session) return;

    setLoading('portal');
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
        toast.success("Opening subscription management...");
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast.error("Failed to open subscription management. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const isCurrentPlan = (productId: string) => {
    return subscription?.subscribed && subscription?.product_id === productId;
  };

  const features = [
    "Unlimited daily personalized reps",
    "AI-powered rep generation",
    "Progress tracking & analytics",
    "Push notifications",
    "Full rep history",
    "Priority support",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-muted-foreground text-lg">
            Get unlimited access to all premium features
          </p>
          {subscription?.subscribed && subscription?.subscription_end && (
            <Badge variant="secondary" className="mt-4">
              Active until {new Date(subscription.subscription_end).toLocaleDateString()}
            </Badge>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
          <Card className={isCurrentPlan(SUBSCRIPTION_PLANS.monthly.productId) ? "border-primary shadow-lg" : ""}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl">{SUBSCRIPTION_PLANS.monthly.name}</CardTitle>
                  <CardDescription>Perfect for trying premium</CardDescription>
                </div>
                {isCurrentPlan(SUBSCRIPTION_PLANS.monthly.productId) && (
                  <Badge variant="default">Current Plan</Badge>
                )}
              </div>
              <div className="mt-4">
                <span className="text-4xl font-bold">{SUBSCRIPTION_PLANS.monthly.price}</span>
                <span className="text-muted-foreground">/{SUBSCRIPTION_PLANS.monthly.interval}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                className="w-full"
                size="lg"
                onClick={() => handleSubscribe(SUBSCRIPTION_PLANS.monthly.priceId, SUBSCRIPTION_PLANS.monthly.name)}
                disabled={loading === SUBSCRIPTION_PLANS.monthly.priceId || isCurrentPlan(SUBSCRIPTION_PLANS.monthly.productId)}
              >
                {isCurrentPlan(SUBSCRIPTION_PLANS.monthly.productId) ? "Current Plan" : "Subscribe Monthly"}
              </Button>
            </CardContent>
          </Card>

          <Card className={isCurrentPlan(SUBSCRIPTION_PLANS.annual.productId) ? "border-primary shadow-lg" : "border-primary/50"}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    {SUBSCRIPTION_PLANS.annual.name}
                    <Sparkles className="h-5 w-5 text-primary" />
                  </CardTitle>
                  <CardDescription>Best value - save 33%</CardDescription>
                </div>
                {isCurrentPlan(SUBSCRIPTION_PLANS.annual.productId) ? (
                  <Badge variant="default">Current Plan</Badge>
                ) : (
                  <Badge variant="secondary">{SUBSCRIPTION_PLANS.annual.savings}</Badge>
                )}
              </div>
              <div className="mt-4">
                <span className="text-4xl font-bold">{SUBSCRIPTION_PLANS.annual.price}</span>
                <span className="text-muted-foreground">/{SUBSCRIPTION_PLANS.annual.interval}</span>
                <p className="text-sm text-muted-foreground mt-1">Just $6.67/month</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                className="w-full"
                size="lg"
                onClick={() => handleSubscribe(SUBSCRIPTION_PLANS.annual.priceId, SUBSCRIPTION_PLANS.annual.name)}
                disabled={loading === SUBSCRIPTION_PLANS.annual.priceId || isCurrentPlan(SUBSCRIPTION_PLANS.annual.productId)}
              >
                {isCurrentPlan(SUBSCRIPTION_PLANS.annual.productId) ? "Current Plan" : "Subscribe Annually"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>All Premium Features</CardTitle>
            <CardDescription>Everything you need to grow daily</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {subscription?.subscribed && (
          <div className="text-center mt-8">
            <Button
              variant="outline"
              onClick={handleManageSubscription}
              disabled={loading === 'portal'}
            >
              Manage Subscription
            </Button>
          </div>
        )}

        <div className="text-center mt-8">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

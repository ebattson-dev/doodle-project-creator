import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    // If user is logged in, they will be handled by ProfileChecker
    // No additional logic needed here as ProfileChecker handles the profile check
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="flex flex-col items-center text-center gap-8 max-w-4xl mx-auto">
          <div className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            AI-Powered Personal Growth
          </div>
          
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Transform Your Life{" "}
            <span className="text-primary">One Day at a Time</span>
          </h1>
          
          <p className="text-lg text-muted-foreground sm:text-xl md:text-2xl max-w-2xl">
            Get personalized daily challenges tailored to your unique goals. Build better habits, achieve personal growth, and become the best version of yourself.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            {user ? (
              <Button size="lg" className="text-lg px-8 py-6" onClick={() => navigate("/dashboard")}>
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Button size="lg" className="text-lg px-8 py-6" onClick={() => navigate("/auth")}>
                  Start Your Free Trial
                </Button>
                <Button size="lg" variant="outline" className="text-lg px-8 py-6" onClick={() => navigate("/auth")}>
                  Sign In
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16 md:py-24 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 md:text-4xl">
            How The Daily Rep Works
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center gap-4 p-6 rounded-lg bg-card border">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
                🎯
              </div>
              <h3 className="text-xl font-semibold">Set Your Goals</h3>
              <p className="text-muted-foreground">
                Tell us what you want to improve - relationships, fitness, career, mindfulness, or any personal goal.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center gap-4 p-6 rounded-lg bg-card border">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
                🤖
              </div>
              <h3 className="text-xl font-semibold">Get Your Daily Rep</h3>
              <p className="text-muted-foreground">
                Receive a unique, AI-generated challenge every day that pushes you toward your goals in creative ways.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center gap-4 p-6 rounded-lg bg-card border">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
                📈
              </div>
              <h3 className="text-xl font-semibold">Track Your Progress</h3>
              <p className="text-muted-foreground">
                Complete your reps, build streaks, and watch yourself grow stronger every single day.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 md:text-4xl">
            Why Choose The Daily Rep?
          </h2>
          
          <div className="grid gap-6">
            <div className="flex gap-4 p-6 rounded-lg border bg-card">
              <div className="text-2xl">✨</div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Never Repetitive</h3>
                <p className="text-muted-foreground">
                  Every single rep is completely unique. No boring routines - just fresh, impactful challenges.
                </p>
              </div>
            </div>
            
            <div className="flex gap-4 p-6 rounded-lg border bg-card">
              <div className="text-2xl">🎨</div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Truly Personalized</h3>
                <p className="text-muted-foreground">
                  AI analyzes your goals and creates challenges specifically for you - not generic advice.
                </p>
              </div>
            </div>
            
            <div className="flex gap-4 p-6 rounded-lg border bg-card">
              <div className="text-2xl">⚡</div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Easy to Apply</h3>
                <p className="text-muted-foreground">
                  Each rep is designed to be digestible and actionable - real growth without overwhelm.
                </p>
              </div>
            </div>
            
            <div className="flex gap-4 p-6 rounded-lg border bg-card">
              <div className="text-2xl">🔥</div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Build Consistency</h3>
                <p className="text-muted-foreground">
                  Track your streaks and momentum. The habit of daily growth is the real transformation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 md:py-24 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4 md:text-4xl">
            Ready to Start Your Journey?
          </h2>
          <p className="text-lg mb-8 opacity-90 md:text-xl">
            Join thousands of people transforming their lives one day at a time.
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            className="text-lg px-8 py-6"
            onClick={() => navigate("/auth")}
          >
            Start Your Free Trial Now
          </Button>
        </div>
      </section>
    </div>
  );
};
export default Index;
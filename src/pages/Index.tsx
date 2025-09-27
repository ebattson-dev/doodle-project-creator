import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

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
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="container flex flex-col items-center justify-center gap-6 px-4 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">The Daily Rep</h1>
        <p className="mx-auto max-w-[700px] text-lg text-muted-foreground sm:text-xl">
          Transform your daily habits and achieve your goals with personalized daily challenges.
          Start your journey to a better you today.
        </p>
        <div className="flex gap-4">
          <Button size="lg" onClick={() => navigate("/auth")}>
            Get Started
          </Button>
        </div>
      </div>
    </div>
  );
};
export default Index;
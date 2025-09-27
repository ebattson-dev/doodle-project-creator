import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="container flex flex-col items-center justify-center gap-6 px-4 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
          The Daily Rep App
        </h1>
        <p className="mx-auto max-w-[700px] text-lg text-muted-foreground sm:text-xl">
          Transform your daily habits and achieve your goals with personalized daily challenges.
          Start your journey to a better you today.
        </p>
        <div className="flex gap-4">
          <Button size="lg" onClick={() => navigate("/onboarding")}>
            Get Started
          </Button>
          <Button variant="outline" size="lg" onClick={() => navigate("/dashboard")}>
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;

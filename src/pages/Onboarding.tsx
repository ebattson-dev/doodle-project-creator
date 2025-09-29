import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Onboarding() {
  const navigate = useNavigate();

  const handleCompleteSetup = () => {
    navigate("/onboarding-form");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold mb-4">
              Welcome to The Daily Rep 👊
            </CardTitle>
            <CardDescription className="text-lg leading-relaxed">
              You're almost ready to start your daily growth journey! 
              <br /><br />
              Let's set up your profile so we can personalize your experience.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              onClick={handleCompleteSetup} 
              size="lg" 
              className="w-full"
            >
              Complete Setup
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
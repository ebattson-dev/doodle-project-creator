import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => new Set(prev).add(entry.target.id));
          }
        });
      },
      { threshold: 0.1 }
    );

    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

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
      <section 
        id="hero"
        ref={(el) => (sectionRefs.current.hero = el)}
        className={`container mx-auto px-4 py-16 md:py-24 transition-all duration-1000 ${
          visibleSections.has("hero") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
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
      <section 
        id="features"
        ref={(el) => (sectionRefs.current.features = el)}
        className={`container mx-auto px-4 py-16 md:py-24 bg-muted/30 transition-all duration-1000 ${
          visibleSections.has("features") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
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

      {/* Social Proof Section */}
      <section 
        id="social-proof"
        ref={(el) => (sectionRefs.current["social-proof"] = el)}
        className={`container mx-auto px-4 py-16 md:py-24 transition-all duration-1000 ${
          visibleSections.has("social-proof") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <div className="max-w-5xl mx-auto text-center mb-12">
          <p className="text-muted-foreground text-lg mb-2">Trusted by thousands</p>
          <h2 className="text-3xl font-bold md:text-4xl mb-4">
            Join 1,000+ People Transforming Daily
          </h2>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card className="p-6">
            <div className="flex flex-col gap-4">
              <div className="flex gap-1 text-yellow-500">
                {"★★★★★".split("").map((star, i) => (
                  <span key={i}>{star}</span>
                ))}
              </div>
              <p className="text-muted-foreground italic">
                "The Daily Rep completely changed how I approach personal growth. Every challenge is unique and actually helps me improve."
              </p>
              <div className="font-semibold">— Sarah M.</div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex flex-col gap-4">
              <div className="flex gap-1 text-yellow-500">
                {"★★★★★".split("").map((star, i) => (
                  <span key={i}>{star}</span>
                ))}
              </div>
              <p className="text-muted-foreground italic">
                "I've tried so many habit apps, but this is different. The AI really understands what I need each day."
              </p>
              <div className="font-semibold">— Marcus J.</div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex flex-col gap-4">
              <div className="flex gap-1 text-yellow-500">
                {"★★★★★".split("").map((star, i) => (
                  <span key={i}>{star}</span>
                ))}
              </div>
              <p className="text-muted-foreground italic">
                "My 47-day streak is proof this works. Simple, effective, and never boring."
              </p>
              <div className="font-semibold">— Alex K.</div>
            </div>
          </Card>
        </div>
      </section>

      {/* Benefits Section */}
      <section 
        id="benefits"
        ref={(el) => (sectionRefs.current.benefits = el)}
        className={`container mx-auto px-4 py-16 md:py-24 bg-muted/30 transition-all duration-1000 ${
          visibleSections.has("benefits") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
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

      {/* Pricing Teaser */}
      <section 
        id="pricing"
        ref={(el) => (sectionRefs.current.pricing = el)}
        className={`container mx-auto px-4 py-16 md:py-24 transition-all duration-1000 ${
          visibleSections.has("pricing") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4 md:text-4xl">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Start with a 1-day free trial. No credit card required.
          </p>
          
          <Card className="p-8 max-w-md mx-auto border-2 border-primary">
            <div className="text-center">
              <div className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-4">
                Most Popular
              </div>
              <h3 className="text-2xl font-bold mb-2">Premium</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">$9.99</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="text-left space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Unlimited AI-generated daily reps</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Personalized to your goals</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Streak tracking & progress analytics</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Daily push notifications</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>1-day free trial</span>
                </li>
              </ul>
              <Button 
                size="lg" 
                className="w-full text-lg"
                onClick={() => navigate("/auth")}
              >
                Start Free Trial
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
                Cancel anytime. No questions asked.
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* FAQ Section */}
      <section 
        id="faq"
        ref={(el) => (sectionRefs.current.faq = el)}
        className={`container mx-auto px-4 py-16 md:py-24 bg-muted/30 transition-all duration-1000 ${
          visibleSections.has("faq") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 md:text-4xl">
            Frequently Asked Questions
          </h2>
          
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-left">
                How does the free trial work?
              </AccordionTrigger>
              <AccordionContent>
                Sign up and get 1 day of full access to The Daily Rep. No credit card required. 
                After the trial, you can subscribe for $9.99/month or continue with limited free access.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger className="text-left">
                What makes The Daily Rep different from other habit apps?
              </AccordionTrigger>
              <AccordionContent>
                Unlike generic habit trackers, The Daily Rep uses AI to create completely unique, 
                personalized challenges every single day based on YOUR specific goals. No two reps 
                are ever the same, keeping your growth journey fresh and engaging.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger className="text-left">
                How much time do daily reps take?
              </AccordionTrigger>
              <AccordionContent>
                Each rep is designed to be digestible and actionable - typically taking 5-30 minutes 
                to complete. The AI tailors the challenge to fit into your real life, not the other way around.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger className="text-left">
                Can I cancel my subscription anytime?
              </AccordionTrigger>
              <AccordionContent>
                Absolutely. You can cancel your subscription at any time with just one click. 
                No questions asked, no hassle. Your access continues until the end of your billing period.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5">
              <AccordionTrigger className="text-left">
                What areas of life can I work on?
              </AccordionTrigger>
              <AccordionContent>
                The Daily Rep covers all aspects of personal growth: relationships, fitness, career, 
                mindfulness, creativity, leadership, health, and more. You set your focus areas and 
                goals, and the AI generates reps tailored to what matters to you.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6">
              <AccordionTrigger className="text-left">
                Is my data private and secure?
              </AccordionTrigger>
              <AccordionContent>
                Yes. Your personal information, goals, and progress are encrypted and never shared 
                with third parties. We take your privacy seriously and comply with all data protection regulations.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section 
        id="cta"
        ref={(el) => (sectionRefs.current.cta = el)}
        className={`container mx-auto px-4 py-16 md:py-24 bg-primary text-primary-foreground transition-all duration-1000 ${
          visibleSections.has("cta") ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
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
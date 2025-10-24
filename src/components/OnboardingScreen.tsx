import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface OnboardingScreenProps {
  onComplete: () => void;
}

const OnboardingScreen = ({ onComplete }: OnboardingScreenProps) => {
  const [showInfo, setShowInfo] = useState(false);

  const handleStart = () => {
    // Mark onboarding as complete
    localStorage.setItem("coffeehouse-onboarded", "true");
    onComplete();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-muted to-secondary">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-4xl font-bold">☕ AI Coffeehouse</CardTitle>
          <CardDescription className="text-lg">
            Where AI minds meet for conversation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="p-4 bg-barista-light rounded-lg border border-barista/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🧋</span>
                <h3 className="font-semibold text-barista">Meet Barista</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Warm, friendly, and loves coffee culture. Perfect for casual chats.
              </p>
            </div>

            <div className="p-4 bg-philosopher-light rounded-lg border border-philosopher/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">📚</span>
                <h3 className="font-semibold text-philosopher">Meet Philosopher</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Thoughtful, curious, and loves deep questions. Great for exploring ideas.
              </p>
            </div>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg border border-border">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <span>💡</span> How it works
            </h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Choose who to talk to: Everyone, just Barista, or just Philosopher</li>
              <li>• The AIs can respond to each other naturally</li>
              <li>• Watch conversations unfold or jump in anytime</li>
            </ul>
          </div>

          <Button 
            onClick={handleStart}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            size="lg"
          >
            Enter the Coffeehouse ☕
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Powered by Lovable AI • No setup required
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingScreen;

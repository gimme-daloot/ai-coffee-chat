import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SettingsModal = ({ open, onOpenChange }: SettingsModalProps) => {
  const { toast } = useToast();

  const handleResetOnboarding = () => {
    localStorage.removeItem("coffeehouse-onboarded");
    toast({
      title: "Reset Complete",
      description: "Refresh the page to see the onboarding screen again.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your AI Coffeehouse preferences
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">About</h3>
            <p className="text-sm text-muted-foreground">
              AI Coffeehouse uses Lovable AI to power conversations between two unique AI personalities. 
              No API keys required!
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Reset</h3>
            <Button
              variant="outline"
              onClick={handleResetOnboarding}
              className="w-full"
            >
              Reset Onboarding
            </Button>
          </div>

          <div className="space-y-2 pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Powered by</span>
              <span className="font-medium">Lovable AI</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal;

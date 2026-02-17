import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const SupportButton = () => (
  <div className="fixed bottom-6 right-6 z-50">
    <Button
      size="icon"
      className="h-14 w-14 rounded-full bg-primary hover:bg-[hsl(142,71%,38%)] shadow-lg transition-colors"
      onClick={() => window.open("https://wa.me/5500000000000", "_blank")}
    >
      <MessageCircle className="w-6 h-6" />
    </Button>
  </div>
);

export default SupportButton;

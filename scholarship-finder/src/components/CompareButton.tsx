import { Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface CompareButtonProps {
  selectedCount: number;
  onCompare: () => void;
}

export function CompareButton({ selectedCount, onCompare }: CompareButtonProps) {
  const { toast } = useToast();

  const handleClick = () => {
    if (selectedCount === 0) {
      toast({
        title: "Select Scholarships",
        description: "Please select at least 2 scholarships to compare.",
        variant: "destructive",
      });
      return;
    }
    if (selectedCount < 2) {
      toast({
        title: "Select More Scholarships",
        description: "Please select at least 2 scholarships to compare.",
        variant: "destructive",
      });
      return;
    }
    onCompare();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        onClick={handleClick}
        className="h-14 px-6 bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-lg rounded-full flex items-center gap-3"
      >
        <Scale className="w-5 h-5" />
        Compare {selectedCount > 0 && `(${selectedCount})`}
      </Button>
    </div>
  );
}

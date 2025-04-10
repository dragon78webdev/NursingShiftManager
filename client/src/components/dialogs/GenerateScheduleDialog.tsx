import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format, addMonths } from "date-fns";

interface GenerateScheduleDialogProps {
  onClose: () => void;
}

const GenerateScheduleDialog = ({ onClose }: GenerateScheduleDialogProps) => {
  const { toast } = useToast();

  // Default to next month
  const nextMonth = addMonths(new Date(), 1);
  const defaultStartDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1);
  const defaultEndDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0);

  // Form state
  const [formData, setFormData] = useState({
    staffType: "nurse" as "nurse" | "oss",
    startDate: format(defaultStartDate, "yyyy-MM-dd"),
    endDate: format(defaultEndDate, "yyyy-MM-dd"),
    considerVacations: true,
    considerPartTime: true,
    balanceShifts: true,
    sendEmail: true,
    exportPdf: true,
  });

  // Mutation for generating schedule
  const generateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/schedule/generate", {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/schedule'] });
      toast({
        title: "Turni generati",
        description: "I turni sono stati generati con successo",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  // Handle form input changes
  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generateMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-neutral-900 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-lg w-full mx-4">
        <div className="p-4 border-b border-neutral-200 flex justify-between items-center">
          <h3 className="font-semibold text-lg">Genera Turni</h3>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-4 space-y-4">
            <div>
              <Label htmlFor="staffType">Tipo di personale</Label>
              <Select
                value={formData.staffType}
                onValueChange={(value) => handleChange("staffType", value)}
              >
                <SelectTrigger id="staffType" className="w-full">
                  <SelectValue placeholder="Seleziona tipo di personale" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nurse">Infermieri</SelectItem>
                  <SelectItem value="oss">OSS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Data inizio</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleChange("startDate", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="endDate">Data fine</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleChange("endDate", e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <Label>Considerazioni speciali</Label>
              <div className="space-y-2 mt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="considerVacations"
                    checked={formData.considerVacations}
                    onCheckedChange={(checked) => 
                      handleChange("considerVacations", checked === true)
                    }
                  />
                  <Label htmlFor="considerVacations" className="text-sm font-normal cursor-pointer">
                    Considera ferie e permessi
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="considerPartTime"
                    checked={formData.considerPartTime}
                    onCheckedChange={(checked) => 
                      handleChange("considerPartTime", checked === true)
                    }
                  />
                  <Label htmlFor="considerPartTime" className="text-sm font-normal cursor-pointer">
                    Considera orari part-time
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="balanceShifts"
                    checked={formData.balanceShifts}
                    onCheckedChange={(checked) => 
                      handleChange("balanceShifts", checked === true)
                    }
                  />
                  <Label htmlFor="balanceShifts" className="text-sm font-normal cursor-pointer">
                    Bilancia turni notte e weekend
                  </Label>
                </div>
              </div>
            </div>
            
            <div>
              <Label>Azioni dopo la generazione</Label>
              <div className="space-y-2 mt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sendEmail"
                    checked={formData.sendEmail}
                    onCheckedChange={(checked) => 
                      handleChange("sendEmail", checked === true)
                    }
                  />
                  <Label htmlFor="sendEmail" className="text-sm font-normal cursor-pointer">
                    Invia email al personale
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="exportPdf"
                    checked={formData.exportPdf}
                    onCheckedChange={(checked) => 
                      handleChange("exportPdf", checked === true)
                    }
                  />
                  <Label htmlFor="exportPdf" className="text-sm font-normal cursor-pointer">
                    Esporta PDF
                  </Label>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-4 border-t border-neutral-200 flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={generateMutation.isPending}
            >
              Annulla
            </Button>
            <Button 
              type="submit"
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? "Generazione..." : "Genera Turni"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GenerateScheduleDialog;

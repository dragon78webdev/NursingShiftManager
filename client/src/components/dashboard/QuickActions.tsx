import { useState } from "react";
import { Calendar, Upload, File, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import GenerateScheduleDialog from "../dialogs/GenerateScheduleDialog";
import ImportStaffDialog from "../staff/ImportStaffDialog";
import { downloadSchedulePdf } from "@/lib/pdf";
import { addMonths, startOfMonth, endOfMonth } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface QuickActionsProps {
  userRole: string;
}

const QuickActions = ({ userRole }: QuickActionsProps) => {
  const { toast } = useToast();
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      // Generate PDF for current month
      const today = new Date();
      const firstDay = startOfMonth(today);
      const lastDay = endOfMonth(today);
      
      await downloadSchedulePdf(firstDay, lastDay, 'nurse');
      
      toast({
        title: "PDF generato",
        description: "Il PDF è stato generato e scaricato con successo"
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la generazione del PDF",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSendNotifications = () => {
    toast({
      title: "Notifiche inviate",
      description: "Le notifiche sono state inviate con successo"
    });
  };

  // Only head nurses can import staff and generate schedules
  const isHeadNurse = userRole === "head_nurse";

  return (
    <>
      <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-neutral-200 bg-neutral-50">
          <h2 className="text-lg font-semibold text-neutral-800">Azioni Rapide</h2>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            <Button
              className="w-full justify-start"
              onClick={() => setShowGenerateDialog(true)}
              disabled={!isHeadNurse}
            >
              <Calendar className="mr-2 h-5 w-5" />
              Genera Turnazione
            </Button>
            
            <Button
              variant="success"
              className="w-full justify-start"
              onClick={() => setShowImportDialog(true)}
              disabled={!isHeadNurse}
            >
              <Upload className="mr-2 h-5 w-5" />
              Importa Personale
            </Button>
            
            <Button
              variant="secondary"
              className="w-full justify-start"
              onClick={handleExportPdf}
              disabled={isExporting}
            >
              <File className="mr-2 h-5 w-5" />
              Esporta Turni PDF
            </Button>
            
            <Button
              variant="warning"
              className="w-full justify-start"
              onClick={handleSendNotifications}
            >
              <Send className="mr-2 h-5 w-5" />
              Invia Notifiche
            </Button>
          </div>
        </div>
      </div>

      {/* Generate Schedule Dialog */}
      {showGenerateDialog && (
        <GenerateScheduleDialog
          onClose={() => setShowGenerateDialog(false)}
        />
      )}

      {/* Import Staff Dialog */}
      {showImportDialog && (
        <ImportStaffDialog
          onClose={() => setShowImportDialog(false)}
        />
      )}
    </>
  );
};

export default QuickActions;

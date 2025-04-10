import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { X, Upload, FileText } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

interface ImportStaffDialogProps {
  onClose: () => void;
}

const ImportStaffDialog = ({ onClose }: ImportStaffDialogProps) => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      
      // Show preview notification
      toast({
        title: "File selezionato",
        description: `File: ${selectedFile.name}`,
      });
      
      // In a real implementation, we would parse the Excel file here
      // and show a preview of the data
      // For this demo, we'll just show a message
      setPreviewData([]);
    }
  };

  // Mutation for importing staff
  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return apiRequest("POST", "/api/staff/import", formData);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: "Importazione completata",
        description: `${data.imported} membri dello staff importati con successo`,
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

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setImporting(true);
    
    if (!file) {
      toast({
        title: "Errore",
        description: "Nessun file selezionato",
        variant: "destructive",
      });
      setImporting(false);
      return;
    }
    
    const formData = new FormData();
    formData.append("file", file);
    
    importMutation.mutate(formData);
  };

  // Download sample template
  const downloadTemplate = () => {
    // In a real implementation, this would download an Excel template
    // For this demo, we'll just show a message
    toast({
      title: "Template",
      description: "Il template di esempio sarebbe scaricato qui",
    });
  };

  return (
    <div className="fixed inset-0 bg-neutral-900 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full mx-4">
        <div className="p-4 border-b border-neutral-200 flex justify-between items-center">
          <h3 className="font-semibold text-lg">Importa Personale</h3>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-4 space-y-4">
            <div className="bg-blue-50 text-blue-800 p-4 rounded-md text-sm">
              <p className="flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Puoi importare l'elenco del personale da un file Excel con i seguenti campi:
                <button 
                  type="button"
                  onClick={downloadTemplate}
                  className="ml-2 text-blue-600 hover:underline"
                >
                  Scarica template
                </button>
              </p>
              <ul className="mt-2 list-disc list-inside ml-2">
                <li>name: nome completo</li>
                <li>email: indirizzo email</li>
                <li>role: ruolo (nurse, oss, head_nurse)</li>
                <li>department: reparto/unità</li>
                <li>facility: sede</li>
                <li>isPartTime: true/false</li>
                <li>partTimeHours: ore settimanali (opzionale)</li>
              </ul>
            </div>
            
            <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
              <Input
                id="file-upload"
                type="file"
                className="hidden"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center justify-center"
              >
                <Upload className="h-10 w-10 text-gray-400 mb-2" />
                <p className="text-sm font-medium">
                  {file ? file.name : "Clicca per selezionare un file Excel"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {file
                    ? `${(file.size / 1024).toFixed(2)} KB`
                    : "Supporta .xlsx, .xls"}
                </p>
              </label>
            </div>
            
            {previewData.length > 0 && (
              <div className="border border-gray-200 rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Ruolo</TableHead>
                      <TableHead>Reparto</TableHead>
                      <TableHead>Sede</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>{row.email}</TableCell>
                        <TableCell>{row.role}</TableCell>
                        <TableCell>{row.department}</TableCell>
                        <TableCell>{row.facility}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          
          <div className="p-4 border-t border-neutral-200 flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={importMutation.isPending || importing}
            >
              Annulla
            </Button>
            <Button 
              type="submit"
              disabled={!file || importMutation.isPending || importing}
            >
              {(importMutation.isPending || importing) ? "Importazione..." : "Importa Personale"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ImportStaffDialog;

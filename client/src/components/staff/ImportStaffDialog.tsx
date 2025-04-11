import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { X, Upload, FileText, AlertCircle, CheckCircle } from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface ImportStaffDialogProps {
  onClose: () => void;
}

const ImportStaffDialog = ({ onClose }: ImportStaffDialogProps) => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [importing, setImporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewError(null);
      setPreviewData([]);
      setPreviewLoading(true);
      setShowPreview(false);
      
      // Show loading notification
      toast({
        title: "File selezionato",
        description: `Analisi di ${selectedFile.name} in corso...`,
      });
      
      // Create FormData and upload for preview
      const formData = new FormData();
      formData.append("file", selectedFile);
      
      try {
        const response = await fetch("/api/staff/preview", {
          method: "POST",
          body: formData,
          credentials: "include"
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || "Errore nell'analisi del file");
        }
        
        setTotalRecords(data.total);
        setPreviewData(data.preview);
        setShowPreview(true);
        
        // Show success message
        toast({
          title: "Anteprima completata",
          description: `${data.total} record trovati nel file Excel`,
        });
      } catch (error) {
        setPreviewError((error as Error).message);
        toast({
          title: "Errore nell'anteprima",
          description: (error as Error).message,
          variant: "destructive",
        });
      } finally {
        setPreviewLoading(false);
      }
    }
  };

  // Mutation for importing staff
  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiRequest("POST", "/api/staff/import", formData);
      return response.json();
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
      setImporting(false);
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
    // Generate CSV content for template
    const templateHeader = "name,email,role,department,facility,isPartTime,partTimeHours\n";
    const templateRows = [
      "Mario Rossi,mario.rossi@example.com,nurse,Cardiologia,Ospedale Centrale,false,\n",
      "Anna Verdi,anna.verdi@example.com,oss,Pediatria,Ospedale Centrale,true,30\n",
      "Giuseppe Bianchi,giuseppe.bianchi@example.com,head_nurse,Medicina,Ospedale Est,false,\n"
    ].join("");
    
    const templateContent = templateHeader + templateRows;
    
    // Create a Blob and download link
    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'template_importazione_staff.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Template scaricato",
      description: "Usa questo file come base per l'importazione del personale",
    });
  };

  return (
    <div className="fixed inset-0 bg-neutral-900 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full mx-4 max-h-[90vh] overflow-auto">
        <div className="p-4 border-b border-neutral-200 flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="font-semibold text-lg">Importa Personale</h3>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-4 space-y-4">
            <div className="bg-blue-50 text-blue-800 p-4 rounded-md text-sm">
              <p className="flex items-center flex-wrap">
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
                disabled={previewLoading}
              />
              <label
                htmlFor="file-upload"
                className={`cursor-pointer flex flex-col items-center justify-center ${previewLoading ? 'opacity-50' : ''}`}
              >
                {previewLoading ? (
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-2"></div>
                ) : (
                  <Upload className="h-10 w-10 text-gray-400 mb-2" />
                )}
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
            
            {previewError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Errore nell'analisi del file</AlertTitle>
                <AlertDescription>{previewError}</AlertDescription>
              </Alert>
            )}
            
            {showPreview && (
              <>
                <Alert variant="default" className="bg-green-50 text-green-800 border-green-200">
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Anteprima del file</AlertTitle>
                  <AlertDescription>
                    Trovati {totalRecords} record nel file Excel. Di seguito un'anteprima dei primi 5 record.
                  </AlertDescription>
                </Alert>
            
                <div className="border border-gray-200 rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Ruolo</TableHead>
                        <TableHead>Reparto</TableHead>
                        <TableHead>Sede</TableHead>
                        <TableHead>Tipo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.map((row, index) => (
                        <TableRow key={index}>
                          <TableCell>{row.name}</TableCell>
                          <TableCell>{row.email}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                row.role === "head_nurse"
                                  ? "default"
                                  : row.role === "nurse"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {row.role === "nurse" ? "Infermiere" : 
                               row.role === "oss" ? "OSS" : 
                               row.role === "head_nurse" ? "Caposala" : row.role}
                            </Badge>
                          </TableCell>
                          <TableCell>{row.department}</TableCell>
                          <TableCell>{row.facility}</TableCell>
                          <TableCell>
                            {row.isPartTime === true || row.isPartTime === "true" ? (
                              <Badge variant="outline">
                                Part-time {row.partTimeHours}h
                              </Badge>
                            ) : (
                              <Badge variant="outline">Full-time</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
          
          <div className="p-4 border-t border-neutral-200 flex justify-between items-center sticky bottom-0 bg-white z-10">
            <p className="text-sm text-gray-500">
              {showPreview && `${totalRecords} record pronti per l'importazione`}
            </p>
            <div className="flex space-x-2">
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
                disabled={!showPreview || importMutation.isPending || importing || previewLoading}
              >
                {(importMutation.isPending || importing) ? "Importazione..." : "Importa Personale"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ImportStaffDialog;

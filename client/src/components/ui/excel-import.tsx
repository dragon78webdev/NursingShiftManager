import React, { useState, useRef } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileSpreadsheet, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';

interface ExcelImportProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  endpoint: string;
  title?: string;
  description?: string;
}

export function ExcelImport({ 
  isOpen, 
  onClose, 
  onSuccess,
  endpoint,
  title = 'Importa da Excel',
  description = 'Carica un file Excel con i dati da importare',
}: ExcelImportProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [uploadResults, setUploadResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadStatus('idle');
      setUploadResults(null);
    }
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setUploadStatus('idle');
      setUploadResults(null);
    }
  };
  
  const handleClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleUpload = async () => {
    if (!file) return;
    
    setIsUploading(true);
    setUploadStatus('idle');
    
    try {
      // Read the file as base64
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        if (!e.target?.result) return;
        
        const base64Data = (e.target.result as string).split(',')[1]; // Remove the data URL prefix
        
        try {
          const response = await apiRequest('POST', endpoint, { excelData: base64Data });
          
          setUploadResults(response);
          setUploadStatus('success');
          
          if (response.failed === 0) {
            toast({
              title: 'Importazione completata',
              description: `${response.success} record importati con successo`,
            });
            
            // Close and notify parent on success
            setTimeout(() => {
              onSuccess();
              onClose();
            }, 2000);
          } else {
            toast({
              variant: 'destructive',
              title: 'Importazione completata con errori',
              description: `${response.success} successi, ${response.failed} errori`,
            });
          }
        } catch (error) {
          setUploadStatus('error');
          toast({
            variant: 'destructive',
            title: 'Errore durante l\'importazione',
            description: 'Si è verificato un errore durante l\'elaborazione del file',
          });
        }
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      setUploadStatus('error');
      toast({
        variant: 'destructive',
        title: 'Errore durante l\'importazione',
        description: 'Si è verificato un errore durante l\'elaborazione del file',
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  const resetForm = () => {
    setFile(null);
    setUploadStatus('idle');
    setUploadResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          
          <div 
            className={cn(
              "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
              "hover:border-primary hover:bg-primary/5",
              "flex flex-col items-center justify-center gap-4",
              file ? "border-green-500" : "border-gray-300"
            )}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={handleClick}
          >
            {file ? (
              <>
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <FileSpreadsheet className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                </div>
              </>
            ) : (
              <>
                <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <Upload className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Trascina qui il file Excel o clicca per selezionare</p>
                  <p className="text-xs text-gray-500">Supporta file .xlsx, .xls e .csv</p>
                </div>
              </>
            )}
          </div>
          
          {uploadStatus !== 'idle' && (
            <div className={cn(
              "mt-4 p-4 rounded-lg",
              uploadStatus === 'success' ? "bg-green-50" : "bg-red-50"
            )}>
              <div className="flex items-center gap-2 mb-2">
                {uploadStatus === 'success' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <span className={cn(
                  "font-medium",
                  uploadStatus === 'success' ? "text-green-600" : "text-red-600"
                )}>
                  {uploadStatus === 'success' ? 'Importazione completata' : 'Errore durante l\'importazione'}
                </span>
              </div>
              
              {uploadResults && (
                <div className="text-sm">
                  <p>Importati con successo: {uploadResults.success}</p>
                  <p>Falliti: {uploadResults.failed}</p>
                  
                  {uploadResults.errors && uploadResults.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="font-medium">Errori:</p>
                      <ul className="list-disc list-inside">
                        {uploadResults.errors.slice(0, 3).map((error, index) => (
                          <li key={index} className="text-xs text-red-600">{error}</li>
                        ))}
                        {uploadResults.errors.length > 3 && (
                          <li className="text-xs text-red-600">...e altri {uploadResults.errors.length - 3} errori</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        <DialogFooter>
          {uploadStatus === 'idle' ? (
            <>
              <Button variant="outline" onClick={onClose}>Annulla</Button>
              <Button 
                onClick={handleUpload} 
                disabled={!file || isUploading}
              >
                {isUploading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Caricamento...
                  </div>
                ) : (
                  'Importa'
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={resetForm}>Carica un altro file</Button>
              <Button onClick={onClose}>Chiudi</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ExcelImport;

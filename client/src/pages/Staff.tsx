import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import StaffList from "@/components/staff/StaffList";
import ImportStaffDialog from "@/components/staff/ImportStaffDialog";
import { AuthUser } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Shield } from "lucide-react";

const Staff = () => {
  const { toast } = useToast();
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  // Get current user to check permissions
  const { data: user, isLoading } = useQuery<AuthUser>({
    queryKey: ['/api/auth/user'],
  });
  
  // Check if user is head nurse
  const isHeadNurse = user?.role === 'head_nurse';
  
  // Redirect or show access denied message if not head nurse
  useEffect(() => {
    if (!isLoading && !isHeadNurse) {
      toast({
        title: "Accesso negato",
        description: "Solo i caposala possono accedere a questa pagina",
        variant: "destructive",
      });
    }
  }, [isLoading, isHeadNurse, toast]);
  
  if (isLoading) {
    return (
      <div className="py-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }
  
  // Show access denied if not head nurse
  if (!isHeadNurse) {
    return (
      <div className="py-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Shield className="h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Accesso negato</h1>
        <p className="text-gray-600 max-w-md">
          Solo i caposala hanno accesso alla gestione del personale.
          Contatta il tuo caposala per eventuali modifiche.
        </p>
      </div>
    );
  }
  
  return (
    <div className="py-6 space-y-6">
      <StaffList 
        onAddClick={() => setShowAddDialog(true)}
        onImportClick={() => setShowImportDialog(true)}
      />
      
      {showImportDialog && (
        <ImportStaffDialog
          onClose={() => setShowImportDialog(false)}
        />
      )}
      
      {/* Add Staff Dialog would be implemented here */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-neutral-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
            <h3 className="font-semibold text-lg mb-4">Aggiungi Personale</h3>
            <p className="text-gray-600 mb-4">
              Questa funzionalità sarà implementata in una versione futura.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowAddDialog(false)}
                className="px-4 py-2 bg-primary text-white rounded-md"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Staff;

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AuthUser, DelegationData } from "@/lib/types";
import { Shield, Plus, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import DelegatesList from "@/components/delegates/DelegatesList";
import AddDelegateForm from "@/components/delegates/AddDelegateForm";

const Delegates = () => {
  const { toast } = useToast();
  const [showAddDelegateForm, setShowAddDelegateForm] = useState(false);

  // Get current user to check permissions
  const { data: user, isLoading: isLoadingUser } = useQuery<AuthUser>({
    queryKey: ['/api/auth/user'],
  });
  
  // Fetch delegations
  const { data: delegations = [], isLoading: isLoadingDelegations } = useQuery<DelegationData[]>({
    queryKey: ['/api/delegations'],
    enabled: user?.role === 'head_nurse',
  });
  
  // Check if user is head nurse
  const isHeadNurse = user?.role === 'head_nurse';

  // Redirect or show access denied message if not head nurse
  useEffect(() => {
    if (!isLoadingUser && !isHeadNurse) {
      toast({
        title: "Accesso negato",
        description: "Solo i caposala possono accedere a questa pagina",
        variant: "destructive",
      });
    }
  }, [isLoadingUser, isHeadNurse, toast]);

  const isLoading = isLoadingUser || isLoadingDelegations;

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
          Solo i caposala hanno accesso alla gestione delle deleghe.
          Contatta il tuo caposala per eventuali modifiche.
        </p>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestione Deleghe</h1>
        <Button onClick={() => setShowAddDelegateForm(true)}>
          <UserCheck className="mr-2 h-4 w-4" />
          Aggiungi Delega
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm p-6">
        <div className="flex items-center mb-6">
          <Shield className="h-6 w-6 text-primary mr-2" />
          <h2 className="text-xl font-semibold">Informazioni Deleghe</h2>
        </div>
        
        <p className="text-gray-600 mb-4">
          Le deleghe ti permettono di assegnare temporaneamente i permessi di gestione turni ad altri utenti.
          Gli utenti delegati potranno generare turni, approvare richieste di cambio turno e gestire le ferie.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-blue-50 p-4 rounded-md">
          <div>
            <p className="text-sm font-medium text-blue-800">Cosa possono fare i delegati:</p>
            <ul className="text-sm text-blue-700 list-disc list-inside mt-2">
              <li>Generare turni</li>
              <li>Approvare richieste di cambio</li>
              <li>Gestire ferie</li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium text-blue-800">Cosa NON possono fare:</p>
            <ul className="text-sm text-blue-700 list-disc list-inside mt-2">
              <li>Modificare informazioni del personale</li>
              <li>Gestire altre deleghe</li>
              <li>Modificare impostazioni di sistema</li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium text-blue-800">Buone pratiche:</p>
            <ul className="text-sm text-blue-700 list-disc list-inside mt-2">
              <li>Limita la durata delle deleghe</li>
              <li>Delega solo a personale fidato</li>
              <li>Verifica periodicamente le deleghe attive</li>
            </ul>
          </div>
        </div>
      </div>

      <DelegatesList 
        delegations={delegations}
      />

      {showAddDelegateForm && (
        <AddDelegateForm
          onClose={() => setShowAddDelegateForm(false)}
        />
      )}
    </div>
  );
};

export default Delegates;

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Calendar, Plus } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { VacationData } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import VacationForm from "@/components/vacations/VacationForm";
import VacationsList from "@/components/vacations/VacationsList";

const Vacations = () => {
  const [showVacationForm, setShowVacationForm] = useState(false);
  
  // Fetch vacations
  const { data: vacations = [], isLoading } = useQuery<VacationData[]>({
    queryKey: ['/api/vacations'],
  });

  // Get current user to check if it's a head nurse
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
  });
  
  const isHeadNurse = user?.role === 'head_nurse';

  if (isLoading) {
    return (
      <div className="py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="animate-pulse h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="animate-pulse h-8 bg-gray-200 rounded w-24"></div>
        </div>
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-2">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Ferie & Permessi</h1>
        <Button onClick={() => setShowVacationForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuova Richiesta
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm p-6">
        <div className="flex items-center mb-6">
          <Calendar className="h-6 w-6 text-primary mr-2" />
          <h2 className="text-xl font-semibold">Calendario Ferie</h2>
        </div>
        
        <p className="text-gray-500 mb-6">
          Visualizza qui il calendario delle ferie del personale. Questa funzionalità sarà disponibile in una versione futura.
        </p>
        
        <div className="border border-dashed border-gray-300 rounded-md p-12 text-center bg-gray-50">
          <p className="text-gray-500">
            Il calendario ferie interattivo sarà implementato prossimamente
          </p>
        </div>
      </div>

      <VacationsList 
        vacations={vacations}
        isHeadNurse={isHeadNurse}
      />

      {showVacationForm && (
        <VacationForm 
          onClose={() => setShowVacationForm(false)}
          onSuccess={() => {
            setShowVacationForm(false);
            queryClient.invalidateQueries({ queryKey: ['/api/vacations'] });
          }}
        />
      )}
    </div>
  );
};

export default Vacations;

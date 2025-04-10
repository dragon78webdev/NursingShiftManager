import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Check, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { VacationData } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface VacationsListProps {
  vacations: VacationData[];
  isHeadNurse: boolean;
  statusFilter?: boolean;
}

const VacationsList = ({ vacations, isHeadNurse, statusFilter }: VacationsListProps) => {
  const { toast } = useToast();
  
  // Mutation for handling vacation status updates
  const updateVacationMutation = useMutation({
    mutationFn: async ({ id, approved }: { id: number, approved: boolean }) => {
      return apiRequest("PATCH", `/api/vacations/${id}`, { approved });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vacations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: "Aggiornamento completato",
        description: "La richiesta di ferie è stata aggiornata con successo",
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  // Get status badge
  const getStatusBadge = (approved: boolean) => {
    if (approved === undefined) return <Badge variant="outline">In attesa</Badge>;
    return approved
      ? <Badge variant="outline" className="bg-green-100 text-green-800">Approvata</Badge>
      : <Badge variant="outline" className="bg-red-100 text-red-800">Rifiutata</Badge>;
  };

  // Filter vacations by status if specified
  const filteredVacations = statusFilter !== undefined
    ? vacations.filter(vacation => vacation.approved === statusFilter)
    : vacations;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold">Le tue richieste di ferie</h2>
      </div>
      <div className="overflow-x-auto">
        {filteredVacations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Non ci sono richieste di ferie
            {statusFilter === true && " approvate"}
            {statusFilter === false && " rifiutate"}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {isHeadNurse && <TableHead>Dipendente</TableHead>}
                <TableHead>Data inizio</TableHead>
                <TableHead>Data fine</TableHead>
                <TableHead>Durata</TableHead>
                <TableHead>Stato</TableHead>
                {isHeadNurse && <TableHead className="text-right">Azioni</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVacations.map((vacation) => {
                const startDate = new Date(vacation.startDate);
                const endDate = new Date(vacation.endDate);
                const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                
                return (
                  <TableRow key={vacation.id} className="hover:bg-gray-50">
                    {isHeadNurse && (
                      <TableCell className="font-medium">
                        {vacation.staffName}
                        <div>
                          <Badge variant={vacation.role === "nurse" ? "secondary" : "outline"} className="mt-1">
                            {vacation.role === "nurse" ? "Infermiere" : "OSS"}
                          </Badge>
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      {format(startDate, 'EEEE d MMMM yyyy', { locale: it })}
                    </TableCell>
                    <TableCell>
                      {format(endDate, 'EEEE d MMMM yyyy', { locale: it })}
                    </TableCell>
                    <TableCell>
                      {durationDays} {durationDays === 1 ? "giorno" : "giorni"}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(vacation.approved)}
                    </TableCell>
                    {isHeadNurse && (
                      <TableCell className="text-right">
                        {vacation.approved === undefined && (
                          <div className="flex justify-end space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-green-100 hover:bg-green-200 text-green-800 border-green-300"
                              onClick={() => updateVacationMutation.mutate({ id: vacation.id, approved: true })}
                              disabled={updateVacationMutation.isPending}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approva
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-red-100 hover:bg-red-200 text-red-800 border-red-300"
                              onClick={() => updateVacationMutation.mutate({ id: vacation.id, approved: false })}
                              disabled={updateVacationMutation.isPending}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Rifiuta
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default VacationsList;

import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { ToggleRight, UserX } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DelegationData } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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

interface DelegatesListProps {
  delegations: DelegationData[];
}

const DelegatesList = ({ delegations }: DelegatesListProps) => {
  const { toast } = useToast();
  
  // Mutation for updating delegation status
  const updateDelegationMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number, active: boolean }) => {
      return apiRequest("PATCH", `/api/delegations/${id}`, { active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/delegations'] });
      toast({
        title: "Delega aggiornata",
        description: "Lo stato della delega è stato aggiornato con successo",
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

  // Mutation for deleting a delegation
  const deleteDelegationMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/delegations/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/delegations'] });
      toast({
        title: "Delega eliminata",
        description: "La delega è stata eliminata con successo",
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

  // Delete delegation
  const handleDeleteDelegation = (id: number) => {
    if (window.confirm("Sei sicuro di voler eliminare questa delega?")) {
      deleteDelegationMutation.mutate(id);
    }
  };

  // ToggleRight delegation status
  const handleToggleDelegation = (id: number, currentActive: boolean) => {
    updateDelegationMutation.mutate({ id, active: !currentActive });
  };

  // Check if a delegation is expired
  const isExpired = (endDate?: string) => {
    if (!endDate) return false;
    return new Date(endDate) < new Date();
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold">Deleghe attive</h2>
      </div>
      <div className="overflow-x-auto">
        {delegations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Non ci sono deleghe configurate
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Delegato</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Data inizio</TableHead>
                <TableHead>Data fine</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {delegations.map((delegation) => {
                const expired = isExpired(delegation.endDate);
                const active = delegation.active && !expired;
                
                return (
                  <TableRow key={delegation.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      {delegation.delegatedToName}
                    </TableCell>
                    <TableCell>{delegation.delegatedToEmail}</TableCell>
                    <TableCell>
                      {format(new Date(delegation.startDate), 'dd/MM/yyyy', { locale: it })}
                    </TableCell>
                    <TableCell>
                      {delegation.endDate 
                        ? format(new Date(delegation.endDate), 'dd/MM/yyyy', { locale: it })
                        : "Nessuna scadenza"}
                    </TableCell>
                    <TableCell>
                      {expired ? (
                        <Badge variant="outline" className="bg-gray-100 text-gray-800">
                          Scaduta
                        </Badge>
                      ) : active ? (
                        <Badge variant="outline" className="bg-green-100 text-green-800">
                          Attiva
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-100 text-red-800">
                          Disattivata
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        {!expired && (
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={active}
                              onCheckedChange={() => handleToggleDelegation(delegation.id, active)}
                              disabled={updateDelegationMutation.isPending}
                            />
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteDelegation(delegation.id)}
                          disabled={deleteDelegationMutation.isPending}
                        >
                          <UserX className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
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

export default DelegatesList;

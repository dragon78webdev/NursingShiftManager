import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Check, X } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ChangeRequestData } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const ChangeRequests = () => {
  const { toast } = useToast();
  
  // Fetch change requests
  const { data: changeRequests = [], isLoading } = useQuery<ChangeRequestData[]>({
    queryKey: ['/api/change-requests'],
  });

  // Mutation for handling request status updates
  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: 'approved' | 'rejected' }) => {
      return apiRequest("PATCH", `/api/change-requests/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/change-requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: "Aggiornamento completato",
        description: "La richiesta è stata aggiornata con successo",
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

  // Format shift type
  const formatShiftType = (type: string) => {
    const types: Record<string, string> = {
      'M': 'Mattina',
      'P': 'Pomeriggio',
      'N': 'Notte',
      'R': 'Riposo',
      'F': 'Ferie'
    };
    return types[type] || type;
  };

  // Get shift cell background class
  const getShiftClass = (type: string) => {
    const classes: Record<string, string> = {
      'M': 'bg-blue-100 text-blue-800',
      'P': 'bg-green-100 text-green-800',
      'N': 'bg-purple-100 text-purple-800',
      'R': 'bg-gray-100 text-gray-800',
      'F': 'bg-yellow-100 text-yellow-800'
    };
    return classes[type] || '';
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Only show pending requests and limit to 3 for dashboard
  const pendingRequests = changeRequests
    .filter(request => request.status === 'pending')
    .slice(0, 3);

  return (
    <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-sm">
      <div className="p-4 border-b border-neutral-200 bg-neutral-50">
        <h2 className="text-lg font-semibold text-neutral-800">Richieste di Cambio Turno</h2>
      </div>
      <div className="p-4 overflow-x-auto">
        {pendingRequests.length === 0 ? (
          <div className="text-center py-4 text-neutral-500">
            Nessuna richiesta di cambio turno in attesa
          </div>
        ) : (
          <table className="w-full border border-neutral-200 rounded-md overflow-hidden">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-neutral-700 bg-neutral-100 border-b border-neutral-200">Richiedente</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-700 bg-neutral-100 border-b border-neutral-200">Data</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-700 bg-neutral-100 border-b border-neutral-200">Turno</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-700 bg-neutral-100 border-b border-neutral-200">Motivo</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-700 bg-neutral-100 border-b border-neutral-200">Stato</th>
                <th className="px-4 py-3 text-left font-semibold text-neutral-700 bg-neutral-100 border-b border-neutral-200">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {pendingRequests.map((request) => (
                <tr key={request.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-2 border-b border-neutral-200">{request.staffName}</td>
                  <td className="px-4 py-2 border-b border-neutral-200">
                    {format(new Date(request.shiftDate), 'dd/MM/yyyy', { locale: it })}
                  </td>
                  <td className="px-4 py-2 border-b border-neutral-200">
                    <div className={`inline-block px-2 py-1 rounded text-center ${getShiftClass(request.shiftType)}`}>
                      {request.shiftType}
                    </div>
                  </td>
                  <td className="px-4 py-2 border-b border-neutral-200">{request.reason}</td>
                  <td className="px-4 py-2 border-b border-neutral-200">
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                      In attesa
                    </span>
                  </td>
                  <td className="px-4 py-2 border-b border-neutral-200">
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => updateRequestMutation.mutate({ id: request.id, status: 'approved' })}
                        disabled={updateRequestMutation.isPending}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => updateRequestMutation.mutate({ id: request.id, status: 'rejected' })}
                        disabled={updateRequestMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex justify-between">
        <Button variant="link" className="text-sm">
          Mostra tutte le richieste
        </Button>
        <div className="text-xs text-neutral-600">
          Mostrando {pendingRequests.length} di {changeRequests.length} richieste
        </div>
      </div>
    </div>
  );
};

export default ChangeRequests;

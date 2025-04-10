import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Check, X, Plus } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ChangeRequestData } from "@/lib/types";
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
import ChangeRequestForm from "@/components/changes/ChangeRequestForm";

const ChangeRequests = () => {
  const { toast } = useToast();
  const [showRequestForm, setShowRequestForm] = useState(false);
  
  // Fetch change requests
  const { data: changeRequests = [], isLoading } = useQuery<ChangeRequestData[]>({
    queryKey: ['/api/change-requests'],
  });

  // Get current user to check if it's a head nurse
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
  });
  
  const isHeadNurse = user?.role === 'head_nurse';

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

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">In attesa</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Approvata</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Rifiutata</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

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
        <h1 className="text-2xl font-bold">Richieste Cambio Turno</h1>
        <Button onClick={() => setShowRequestForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuova Richiesta
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {changeRequests.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Non ci sono richieste di cambio turno
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Richiedente</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead>Richiesta</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Stato</TableHead>
                  {isHeadNurse && <TableHead className="text-right">Azioni</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {changeRequests.map((request) => (
                  <TableRow key={request.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{request.staffName}</TableCell>
                    <TableCell>
                      {format(new Date(request.shiftDate), 'dd/MM/yyyy', { locale: it })}
                    </TableCell>
                    <TableCell>
                      <div className={`inline-block px-2 py-1 rounded text-center ${getShiftClass(request.shiftType)}`}>
                        {request.shiftType}
                      </div>
                    </TableCell>
                    <TableCell>
                      {request.requestedShiftType && (
                        <div className={`inline-block px-2 py-1 rounded text-center ${getShiftClass(request.requestedShiftType)}`}>
                          {request.requestedShiftType}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{request.reason}</TableCell>
                    <TableCell>
                      {getStatusBadge(request.status)}
                    </TableCell>
                    {isHeadNurse && (
                      <TableCell className="text-right">
                        {request.status === 'pending' && (
                          <div className="flex justify-end space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-green-100 hover:bg-green-200 text-green-800 border-green-300"
                              onClick={() => updateRequestMutation.mutate({ id: request.id, status: 'approved' })}
                              disabled={updateRequestMutation.isPending}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approva
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-red-100 hover:bg-red-200 text-red-800 border-red-300"
                              onClick={() => updateRequestMutation.mutate({ id: request.id, status: 'rejected' })}
                              disabled={updateRequestMutation.isPending}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Rifiuta
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {showRequestForm && (
        <ChangeRequestForm 
          onClose={() => setShowRequestForm(false)}
          onSuccess={() => {
            setShowRequestForm(false);
            queryClient.invalidateQueries({ queryKey: ['/api/change-requests'] });
          }}
        />
      )}
    </div>
  );
};

export default ChangeRequests;

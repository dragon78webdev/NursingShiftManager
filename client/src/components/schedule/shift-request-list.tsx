import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, Search, X, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { ShiftRequestStatus, ShiftRequestType, ShiftType } from '@shared/schema';
import { useAuth } from '@/hooks/use-auth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ShiftRequestListProps {
  onAddRequest?: () => void;
}

export function ShiftRequestList({ onAddRequest }: ShiftRequestListProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<any>(null);
  const [actionType, setActionType] = useState<ShiftRequestStatus | null>(null);
  
  const isHeadNurse = user?.role === 'head_nurse';
  
  // Fetch shift requests
  const { data: shiftRequests, isLoading } = useQuery({
    queryKey: ['/api/shift-requests', { status: statusFilter }]
  });
  
  // Filter requests
  const filteredRequests = shiftRequests ? shiftRequests.filter((request: any) => {
    // Apply status filter if set
    if (statusFilter && request.status !== statusFilter) return false;
    
    // Apply type filter if set
    if (typeFilter && request.requestType !== typeFilter) return false;
    
    // Apply search term if set
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const staffName = request.requestedByStaff?.user?.name.toLowerCase() || '';
      const requestId = request.requestId.toLowerCase();
      
      return staffName.includes(searchLower) || requestId.includes(searchLower);
    }
    
    return true;
  }) : [];
  
  // Handle request action (approve/reject)
  const handleRequestAction = async (status: ShiftRequestStatus) => {
    if (!currentRequest) return;
    
    try {
      await apiRequest('PUT', `/api/shift-requests/${currentRequest.id}/status`, { status });
      
      queryClient.invalidateQueries({ queryKey: ['/api/shift-requests'] });
      
      toast({
        title: status === ShiftRequestStatus.APPROVED ? 'Richiesta approvata' : 'Richiesta rifiutata',
        description: `La richiesta ${currentRequest.requestId} è stata ${status === ShiftRequestStatus.APPROVED ? 'approvata' : 'rifiutata'} con successo`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Si è verificato un errore durante l\'elaborazione della richiesta',
      });
    } finally {
      setConfirmDialogOpen(false);
      setCurrentRequest(null);
      setActionType(null);
    }
  };
  
  // Open confirmation dialog for approving/rejecting
  const openConfirmDialog = (request: any, action: ShiftRequestStatus) => {
    setCurrentRequest(request);
    setActionType(action);
    setConfirmDialogOpen(true);
  };
  
  // Open details dialog
  const openDetailsDialog = (request: any) => {
    setCurrentRequest(request);
    setDetailsDialogOpen(true);
  };
  
  // Format request type
  const formatRequestType = (type: ShiftRequestType) => {
    switch (type) {
      case ShiftRequestType.SWAP:
        return <Badge className="bg-blue-100 text-blue-800">Cambio con collega</Badge>;
      case ShiftRequestType.TIME_OFF:
        return <Badge className="bg-green-100 text-green-800">Richiesta ferie</Badge>;
      case ShiftRequestType.COMPENSATION:
        return <Badge className="bg-purple-100 text-purple-800">Riposo compensativo</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };
  
  // Format request status
  const formatRequestStatus = (status: ShiftRequestStatus) => {
    switch (status) {
      case ShiftRequestStatus.PENDING:
        return <Badge className="bg-yellow-100 text-yellow-800">In attesa</Badge>;
      case ShiftRequestStatus.APPROVED:
        return <Badge className="bg-green-100 text-green-800">Approvata</Badge>;
      case ShiftRequestStatus.REJECTED:
        return <Badge className="bg-red-100 text-red-800">Rifiutata</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  // Format shift type
  const formatShiftType = (type: ShiftType) => {
    switch (type) {
      case ShiftType.MORNING:
        return 'Turno mattina';
      case ShiftType.AFTERNOON:
        return 'Turno pomeriggio';
      case ShiftType.NIGHT:
        return 'Turno notte';
      case ShiftType.OFF:
        return 'Riposo';
      case ShiftType.VACATION:
        return 'Ferie';
      case ShiftType.SICK:
        return 'Malattia';
      default:
        return type;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tutti gli stati" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tutti gli stati</SelectItem>
              <SelectItem value={ShiftRequestStatus.PENDING}>In attesa</SelectItem>
              <SelectItem value={ShiftRequestStatus.APPROVED}>Approvate</SelectItem>
              <SelectItem value={ShiftRequestStatus.REJECTED}>Rifiutate</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tutti i tipi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tutti i tipi</SelectItem>
              <SelectItem value={ShiftRequestType.SWAP}>Cambio con collega</SelectItem>
              <SelectItem value={ShiftRequestType.TIME_OFF}>Richiesta ferie</SelectItem>
              <SelectItem value={ShiftRequestType.COMPENSATION}>Riposo compensativo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              className="pl-10"
              placeholder="Cerca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {onAddRequest && (
            <Button onClick={onAddRequest}>
              Nuova richiesta
            </Button>
          )}
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Richiesta</TableHead>
              <TableHead>Richiedente</TableHead>
              <TableHead>Data Turno</TableHead>
              <TableHead>Tipo Cambio</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead>Data Richiesta</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-gray-500">
                  Nessuna richiesta trovata
                </TableCell>
              </TableRow>
            ) : (
              filteredRequests.map((request: any) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">#{request.requestId}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Avatar className="h-8 w-8 mr-3">
                        <AvatarImage 
                          src={request.requestedByStaff?.user?.avatar || ''} 
                          alt={request.requestedByStaff?.user?.name} 
                        />
                        <AvatarFallback>
                          {request.requestedByStaff?.user?.name
                            ? request.requestedByStaff.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
                            : 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{request.requestedByStaff?.user?.name}</div>
                        <div className="text-xs text-gray-500">
                          {request.requestedByStaff?.user?.role === 'nurse' ? 'Infermiere' : 'OSS'}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-900">
                      {format(new Date(request.shiftDate), 'dd/MM/yyyy', { locale: it })}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatShiftType(request.shiftType)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatRequestType(request.requestType)}
                  </TableCell>
                  <TableCell>
                    {formatRequestStatus(request.status)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {format(new Date(request.createdAt), 'dd/MM/yyyy HH:mm', { locale: it })}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {isHeadNurse && request.status === ShiftRequestStatus.PENDING ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-green-600 hover:text-green-800 mr-2"
                          onClick={() => openConfirmDialog(request, ShiftRequestStatus.APPROVED)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-800 mr-2"
                          onClick={() => openConfirmDialog(request, ShiftRequestStatus.REJECTED)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-gray-400 cursor-not-allowed mr-2"
                          disabled
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-gray-400 cursor-not-allowed mr-2"
                          disabled
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-blue-600 hover:text-blue-800"
                      onClick={() => openDetailsDialog(request)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === ShiftRequestStatus.APPROVED 
                ? 'Conferma approvazione' 
                : 'Conferma rifiuto'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === ShiftRequestStatus.APPROVED 
                ? `Sei sicuro di voler approvare la richiesta #${currentRequest?.requestId}?` 
                : `Sei sicuro di voler rifiutare la richiesta #${currentRequest?.requestId}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => actionType && handleRequestAction(actionType)}
              className={actionType === ShiftRequestStatus.APPROVED 
                ? "bg-green-600 text-white hover:bg-green-700" 
                : "bg-red-600 text-white hover:bg-red-700"}
            >
              {actionType === ShiftRequestStatus.APPROVED ? 'Approva' : 'Rifiuta'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Dettagli richiesta #{currentRequest?.requestId}</DialogTitle>
            <DialogDescription>
              Informazioni dettagliate sulla richiesta di cambio turno
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">Richiedente</p>
              <p className="text-sm">{currentRequest?.requestedByStaff?.user?.name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">Data richiesta</p>
              <p className="text-sm">
                {currentRequest?.createdAt && format(new Date(currentRequest.createdAt), 'dd/MM/yyyy HH:mm', { locale: it })}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">Data turno</p>
              <p className="text-sm">
                {currentRequest?.shiftDate && format(new Date(currentRequest.shiftDate), 'dd/MM/yyyy', { locale: it })}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">Turno</p>
              <p className="text-sm">
                {currentRequest?.shiftType && formatShiftType(currentRequest.shiftType)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">Tipo richiesta</p>
              <p className="text-sm">
                {currentRequest?.requestType === ShiftRequestType.SWAP 
                  ? 'Cambio con collega' 
                  : currentRequest?.requestType === ShiftRequestType.TIME_OFF 
                  ? 'Richiesta ferie' 
                  : 'Riposo compensativo'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500">Stato</p>
              <p className="text-sm">
                {currentRequest?.status === ShiftRequestStatus.PENDING 
                  ? 'In attesa' 
                  : currentRequest?.status === ShiftRequestStatus.APPROVED 
                  ? 'Approvata' 
                  : 'Rifiutata'}
              </p>
            </div>
            <div className="col-span-2 space-y-1">
              <p className="text-sm font-medium text-gray-500">Motivazione</p>
              <p className="text-sm">{currentRequest?.reason || 'Nessuna motivazione fornita'}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ShiftRequestList;

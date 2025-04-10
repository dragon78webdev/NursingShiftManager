import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { StaffStatus, ContractType, UserRole, Staff, User } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from '@/components/ui/pagination';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Pencil, Trash, Search, UserPlus, FileSpreadsheet } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { Badge } from '@/components/ui/badge';
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
import { useToast } from '@/hooks/use-toast';

type StaffWithUser = Staff & { user: User };

interface StaffListProps {
  onAdd: () => void;
  onEdit: (staff: StaffWithUser) => void;
  onImport: () => void;
}

export function StaffList({ onAdd, onEdit, onImport }: StaffListProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [contractFilter, setContractFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<StaffWithUser | null>(null);
  
  const itemsPerPage = 10;
  
  // Fetch staff data
  const { data: staffData, isLoading } = useQuery({
    queryKey: ['/api/staff', { role: roleFilter, contractType: contractFilter, status: statusFilter }]
  });
  
  // Filter by search term
  const filteredStaff = staffData ? staffData.filter((staff: StaffWithUser) => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      staff.user.name.toLowerCase().includes(searchLower) ||
      staff.user.email.toLowerCase().includes(searchLower) ||
      staff.staffId.toLowerCase().includes(searchLower)
    );
  }) : [];
  
  // Paginate
  const totalPages = Math.ceil(filteredStaff.length / itemsPerPage);
  const paginatedStaff = filteredStaff.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  // Delete staff member
  const handleDelete = async () => {
    if (!staffToDelete) return;
    
    try {
      await apiRequest('DELETE', `/api/staff/${staffToDelete.id}`);
      
      queryClient.invalidateQueries({ queryKey: ['/api/staff'] });
      
      toast({
        title: 'Personale eliminato',
        description: 'Il membro del personale è stato eliminato con successo',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Si è verificato un errore durante l\'eliminazione',
      });
    } finally {
      setDeleteConfirmOpen(false);
      setStaffToDelete(null);
    }
  };
  
  // Format staff status badge
  const getStatusBadge = (status: StaffStatus) => {
    switch (status) {
      case StaffStatus.ACTIVE:
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Attivo</Badge>;
      case StaffStatus.VACATION:
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">In ferie</Badge>;
      case StaffStatus.SICK_LEAVE:
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Malattia</Badge>;
      case StaffStatus.INACTIVE:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">Inattivo</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  // Format contract type badge
  const getContractBadge = (contractType: ContractType, partTimePercentage: number | null) => {
    if (contractType === ContractType.FULL_TIME) {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Full-time</Badge>;
    } else {
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
        Part-time ({partTimePercentage}%)
      </Badge>;
    }
  };
  
  // Format role label
  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.NURSE: return 'Infermiere';
      case UserRole.OSS: return 'OSS';
      case UserRole.HEAD_NURSE: return 'Caposala';
      default: return role;
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tutti i ruoli" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tutti i ruoli</SelectItem>
              <SelectItem value={UserRole.NURSE}>Infermieri</SelectItem>
              <SelectItem value={UserRole.OSS}>OSS</SelectItem>
              <SelectItem value={UserRole.HEAD_NURSE}>Caposala</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={contractFilter} onValueChange={setContractFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tempo di lavoro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tempo di lavoro</SelectItem>
              <SelectItem value={ContractType.FULL_TIME}>Full-time</SelectItem>
              <SelectItem value={ContractType.PART_TIME}>Part-time</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tutti gli stati" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tutti gli stati</SelectItem>
              <SelectItem value={StaffStatus.ACTIVE}>Attivo</SelectItem>
              <SelectItem value={StaffStatus.VACATION}>In ferie</SelectItem>
              <SelectItem value={StaffStatus.SICK_LEAVE}>Malattia</SelectItem>
              <SelectItem value={StaffStatus.INACTIVE}>Inattivo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              className="pl-10"
              placeholder="Cerca personale..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <Button onClick={onAdd} className="whitespace-nowrap">
              <UserPlus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Aggiungi</span>
            </Button>
            <Button variant="outline" onClick={onImport} className="whitespace-nowrap">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Importa Excel</span>
            </Button>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Personale</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Ruolo</TableHead>
              <TableHead>Contratto</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedStaff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                  Nessun risultato trovato
                </TableCell>
              </TableRow>
            ) : (
              paginatedStaff.map((staff: StaffWithUser) => (
                <TableRow key={staff.id}>
                  <TableCell>
                    <div className="flex items-center">
                      <Avatar className="h-10 w-10 mr-4">
                        <AvatarImage 
                          src={staff.user.avatar || ''} 
                          alt={staff.user.name} 
                        />
                        <AvatarFallback>
                          {staff.user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{staff.user.name}</div>
                        <div className="text-sm text-gray-500">ID: {staff.staffId}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-900">{staff.user.email}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-900">{getRoleLabel(staff.user.role as UserRole)}</div>
                  </TableCell>
                  <TableCell>
                    {getContractBadge(staff.contractType as ContractType, staff.partTimePercentage)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(staff.status as StaffStatus)}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => onEdit(staff)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        setStaffToDelete(staff);
                        setDeleteConfirmOpen(true);
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {totalPages > 1 && (
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 sm:px-6 flex items-center justify-between">
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Visualizzando <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredStaff.length)}</span> di <span className="font-medium">{filteredStaff.length}</span> risultati
              </p>
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={currentPage === 1} 
                  />
                </PaginationItem>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <PaginationItem key={i}>
                      <PaginationLink
                        onClick={() => setCurrentPage(pageNum)}
                        isActive={pageNum === currentPage}
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages} 
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      )}
      
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sei sicuro di voler eliminare?</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare {staffToDelete?.user.name}. Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 text-white hover:bg-red-700">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default StaffList;

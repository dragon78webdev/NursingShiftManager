import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { StaffListItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PencilIcon, TrashIcon, PlusIcon, UserCog } from "lucide-react";
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

interface StaffListProps {
  onAddClick: () => void;
  onImportClick: () => void;
}

const StaffList = ({ onAddClick, onImportClick }: StaffListProps) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch staff data
  const { data: staff = [], isLoading } = useQuery<StaffListItem[]>({
    queryKey: ['/api/staff'],
  });

  // Delete staff mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/staff/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff'] });
      toast({
        title: "Staff eliminato",
        description: "Il membro dello staff è stato eliminato con successo"
      });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${(error as Error).message}`,
        variant: "destructive"
      });
    }
  });

  // Filter staff by search query
  const filteredStaff = staff.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format role name
  const formatRole = (role: string) => {
    switch (role) {
      case "nurse":
        return "Infermiere";
      case "oss":
        return "OSS";
      case "head_nurse":
        return "Caposala";
      default:
        return role;
    }
  };

  // Delete staff member
  const handleDelete = (id: number) => {
    if (window.confirm("Sei sicuro di voler eliminare questo membro dello staff?")) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Personale</h2>
          <div className="flex space-x-2">
            <Button variant="outline" disabled>
              <PlusIcon className="mr-2 h-4 w-4" />
              Importa
            </Button>
            <Button disabled>
              <PlusIcon className="mr-2 h-4 w-4" />
              Aggiungi
            </Button>
          </div>
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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">Personale</h2>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={onImportClick}>
            <UserCog className="mr-2 h-4 w-4" />
            Importa
          </Button>
          <Button onClick={onAddClick}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Aggiungi
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative w-full sm:w-80">
          <Input
            placeholder="Cerca personale..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Ruolo</TableHead>
                <TableHead>Reparto</TableHead>
                <TableHead>Sede</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                    Nessun membro dello staff trovato
                  </TableCell>
                </TableRow>
              ) : (
                filteredStaff.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          member.role === "head_nurse"
                            ? "default"
                            : member.role === "nurse"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {formatRole(member.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>{member.department}</TableCell>
                    <TableCell>{member.facility}</TableCell>
                    <TableCell>
                      {member.isPartTime ? (
                        <Badge variant="outline">
                          Part-time {member.partTimeHours}h
                        </Badge>
                      ) : (
                        <Badge variant="outline">Full-time</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // Edit functionality would be implemented here
                            toast({
                              title: "Funzionalità non implementata",
                              description: "La modifica dello staff sarà disponibile in futuro"
                            });
                          }}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(member.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <TrashIcon className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default StaffList;

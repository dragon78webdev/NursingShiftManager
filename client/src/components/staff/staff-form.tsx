import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { 
  Form, 
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage 
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ContractType, StaffStatus, UserRole, Staff, User, insertStaffSchema } from '@shared/schema';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface StaffFormProps {
  isOpen: boolean;
  onClose: () => void;
  editMode: boolean;
  staffData?: Staff & { user: User };
}

export function StaffForm({ isOpen, onClose, editMode, staffData }: StaffFormProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    resolver: zodResolver(insertStaffSchema),
    defaultValues: {
      userId: staffData?.userId || 0,
      staffId: staffData?.staffId || '',
      contractType: staffData?.contractType || ContractType.FULL_TIME,
      partTimePercentage: staffData?.partTimePercentage || null,
      status: staffData?.status || StaffStatus.ACTIVE,
      delegatedBy: staffData?.delegatedBy || null,
      delegationActive: staffData?.delegationActive || false
    }
  });

  async function onSubmit(values: any) {
    setIsLoading(true);
    try {
      if (editMode && staffData) {
        await apiRequest('PUT', `/api/staff/${staffData.id}`, values);
        toast({
          title: 'Personale aggiornato',
          description: 'I dati del personale sono stati aggiornati con successo',
        });
      } else {
        await apiRequest('POST', '/api/staff', values);
        toast({
          title: 'Personale aggiunto',
          description: 'Il nuovo membro del personale è stato aggiunto con successo',
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/staff'] });
      onClose();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Si è verificato un errore durante il salvataggio dei dati',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editMode ? 'Modifica personale' : 'Aggiungi personale'}</DialogTitle>
          <DialogDescription>
            {editMode 
              ? 'Modifica i dati del membro del personale' 
              : 'Aggiungi un nuovo membro al personale'}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            {!editMode && (
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Utente</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" placeholder="ID Utente" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <FormField
              control={form.control}
              name="staffId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID Personale</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="es. NRS0001" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="contractType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo Contratto</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona tipo contratto" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={ContractType.FULL_TIME}>Full-time</SelectItem>
                      <SelectItem value={ContractType.PART_TIME}>Part-time</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {form.watch('contractType') === ContractType.PART_TIME && (
              <FormField
                control={form.control}
                name="partTimePercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Percentuale Part-time</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        min="1" 
                        max="99" 
                        placeholder="es. 50"
                        onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : null)} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stato</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona stato" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={StaffStatus.ACTIVE}>Attivo</SelectItem>
                      <SelectItem value={StaffStatus.VACATION}>In ferie</SelectItem>
                      <SelectItem value={StaffStatus.SICK_LEAVE}>Malattia</SelectItem>
                      <SelectItem value={StaffStatus.INACTIVE}>Inattivo</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button variant="outline" type="button" onClick={onClose}>Annulla</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Salvataggio...
                  </div>
                ) : (
                  'Salva'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default StaffForm;

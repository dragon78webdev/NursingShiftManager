import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { 
  Form, 
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage 
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { UserRole } from '@shared/schema';

// Define form schema with zod
const generateScheduleSchema = z.object({
  staffType: z.enum([UserRole.NURSE, UserRole.OSS]),
  startDate: z.date({
    required_error: "La data di inizio è obbligatoria",
  }),
  endDate: z.date({
    required_error: "La data di fine è obbligatoria",
  }).refine(date => date > new Date(), {
    message: "La data di fine deve essere nel futuro",
  }),
  considerVacations: z.boolean().default(true),
  considerPartTime: z.boolean().default(true),
  distributeNightShifts: z.boolean().default(true),
  avoidConsecutiveNights: z.boolean().default(true),
  sendEmail: z.boolean().default(true),
  generatePdf: z.boolean().default(true),
  sendPushNotification: z.boolean().default(false),
  delegateGeneration: z.boolean().default(false),
  delegatedTo: z.number().optional(),
}).refine(data => data.endDate > data.startDate, {
  message: "La data di fine deve essere successiva alla data di inizio",
  path: ["endDate"],
});

type GenerateScheduleFormValues = z.infer<typeof generateScheduleSchema>;

interface GenerateScheduleFormProps {
  staffMembers: any[];
  onSuccess?: () => void;
}

export function GenerateScheduleForm({ 
  staffMembers, 
  onSuccess 
}: GenerateScheduleFormProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  
  const form = useForm<GenerateScheduleFormValues>({
    resolver: zodResolver(generateScheduleSchema),
    defaultValues: {
      staffType: UserRole.NURSE,
      startDate: new Date(),
      endDate: new Date(new Date().setDate(new Date().getDate() + 14)), // 2 weeks
      considerVacations: true,
      considerPartTime: true,
      distributeNightShifts: true,
      avoidConsecutiveNights: true,
      sendEmail: true,
      generatePdf: true,
      sendPushNotification: false,
      delegateGeneration: false,
    }
  });
  
  // Get eligible staff for delegation (only senior nurses)
  const seniorNurses = staffMembers.filter(staff => 
    staff.user.role === UserRole.NURSE && 
    staff.user.id !== user?.id
  );
  
  async function onSubmit(values: GenerateScheduleFormValues) {
    setIsGenerating(true);
    try {
      await apiRequest('POST', '/api/schedules/generate', values);
      
      queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
      
      toast({
        title: 'Turni generati',
        description: 'I turni sono stati generati con successo',
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Errore',
        description: 'Si è verificato un errore durante la generazione dei turni',
      });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Genera Turni</CardTitle>
        <CardDescription>
          Imposta i parametri per la generazione automatica dei turni
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="staffType"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel>Categoria Personale</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex gap-4"
                        >
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value={UserRole.NURSE} />
                            </FormControl>
                            <FormLabel className="font-normal">Infermieri</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value={UserRole.OSS} />
                            </FormControl>
                            <FormLabel className="font-normal">OSS</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data inizio</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP", { locale: it })
                                ) : (
                                  <span>Seleziona data</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date("1900-01-01")}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data fine</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP", { locale: it })
                                ) : (
                                  <span>Seleziona data</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="considerVacations"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Considera ferie programmate</FormLabel>
                        <FormDescription>
                          Considera le ferie già approvate durante la generazione
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="considerPartTime"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Considera part-time</FormLabel>
                        <FormDescription>
                          Adatta i turni alle percentuali di part-time
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="distributeNightShifts"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Distribuisci equamente turni notturni</FormLabel>
                        <FormDescription>
                          Assicura che i turni di notte siano distribuiti in modo equo
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="avoidConsecutiveNights"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Evita sequenze consecutive di notti</FormLabel>
                        <FormDescription>
                          Cerca di evitare che lo stesso personale faccia troppe notti consecutive
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                <div className="pt-2 space-y-3">
                  <h4 className="text-sm font-medium text-gray-700">Azioni dopo generazione</h4>
                  
                  <FormField
                    control={form.control}
                    name="sendEmail"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Invia email al personale</FormLabel>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="generatePdf"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Genera PDF</FormLabel>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="sendPushNotification"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Invia notifiche push</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="delegateGeneration"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 pt-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Delegare la generazione</FormLabel>
                    </FormItem>
                  )}
                />
                
                {form.watch('delegateGeneration') && (
                  <FormField
                    control={form.control}
                    name="delegatedTo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delegare a:</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))} 
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona un utente" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {seniorNurses.map((nurse) => (
                              <SelectItem key={nurse.id} value={nurse.user.id.toString()}>
                                {nurse.user.name} (Infermiere)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" type="button">
                Annulla
              </Button>
              <Button type="submit" disabled={isGenerating}>
                {isGenerating ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                    Generazione...
                  </div>
                ) : (
                  'Genera Turni'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default GenerateScheduleForm;

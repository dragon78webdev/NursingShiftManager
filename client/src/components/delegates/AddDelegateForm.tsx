import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { X, Calendar } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { format, addMonths, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { StaffListItem } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";

interface AddDelegateFormProps {
  onClose: () => void;
}

const AddDelegateForm = ({ onClose }: AddDelegateFormProps) => {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: addMonths(new Date(), 1)
  });
  
  // Fetch staff list for selection
  const { data: staff = [], isLoading } = useQuery<StaffListItem[]>({
    queryKey: ['/api/staff'],
  });

  // Filter staff by role (nurses only)
  const nurseStaff = staff.filter(member => member.role === 'nurse');

  // Form schema
  const formSchema = z.object({
    delegatedToId: z.number({
      required_error: "Seleziona un infermiere",
    }),
    startDate: z.date({
      required_error: "Seleziona la data di inizio",
    }),
    endDate: z.date().optional(),
    neverExpires: z.boolean().default(false),
  });

  // Form setup
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      neverExpires: false,
    },
  });

  // Toggle never expires
  const neverExpires = form.watch("neverExpires");

  // Create delegation mutation
  const createDelegationMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      // If neverExpires is true, don't send endDate
      const payload = {
        delegatedToId: values.delegatedToId,
        startDate: values.startDate,
        endDate: values.neverExpires ? undefined : values.endDate,
      };
      return apiRequest("POST", "/api/delegations", payload);
    },
    onSuccess: () => {
      toast({
        title: "Delega creata",
        description: "La delega è stata creata con successo",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/delegations'] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  // Handle date range change
  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from) {
      form.setValue("startDate", range.from);
    }
    if (range?.to) {
      form.setValue("endDate", range.to);
    }
  };

  // Form submission
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createDelegationMutation.mutate(values);
  };

  return (
    <div className="fixed inset-0 bg-neutral-900 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
        <div className="p-4 border-b border-neutral-200 flex justify-between items-center">
          <h3 className="font-semibold text-lg">Aggiungi Delega</h3>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="p-4 space-y-4">
              <FormField
                control={form.control}
                name="delegatedToId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seleziona Infermiere</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona un infermiere" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {nurseStaff.map((member) => (
                          <SelectItem key={member.id} value={member.id.toString()}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!neverExpires && (
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Periodo di validità</FormLabel>
                      <DateRangePicker
                        date={dateRange}
                        onDateChange={handleDateRangeChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="neverExpires"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 text-primary focus:ring-primary"
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal">
                      Delega senza scadenza
                    </FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {neverExpires && (
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data di inizio</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: { code: "it" } })
                              ) : (
                                <span>Seleziona una data</span>
                              )}
                              <Calendar className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
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
              )}

              <div className="bg-blue-50 p-3 rounded-md">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Nota:</span> Delegare i permessi di gestione consente all'infermiere 
                  selezionato di generare turni, approvare richieste di cambio e gestire le ferie. 
                  Potrai revocare questa delega in qualsiasi momento.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-neutral-200 flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={createDelegationMutation.isPending}
              >
                Annulla
              </Button>
              <Button
                type="submit"
                disabled={createDelegationMutation.isPending}
              >
                {createDelegationMutation.isPending ? "Creazione..." : "Crea Delega"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default AddDelegateForm;

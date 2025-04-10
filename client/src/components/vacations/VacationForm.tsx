import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { X, Calendar } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { format, isAfter, isBefore, addDays } from "date-fns";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { DateRangePicker } from "@/components/ui/date-range-picker";

interface VacationFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const VacationForm = ({ onClose, onSuccess }: VacationFormProps) => {
  const { toast } = useToast();
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), 7),
    to: addDays(new Date(), 14)
  });

  // Form schema
  const formSchema = z.object({
    startDate: z.date({
      required_error: "Seleziona la data di inizio",
    }),
    endDate: z.date({
      required_error: "Seleziona la data di fine",
    }),
    notes: z.string().optional(),
  }).refine(data => isBefore(data.startDate, data.endDate) || data.startDate.getTime() === data.endDate.getTime(), {
    message: "La data di fine deve essere uguale o successiva alla data di inizio",
    path: ["endDate"],
  }).refine(data => isAfter(data.startDate, new Date()), {
    message: "La data di inizio deve essere nel futuro",
    path: ["startDate"],
  });

  // Form setup
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      notes: "",
    },
  });

  // Create vacation request mutation
  const createVacationMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      return apiRequest("POST", "/api/vacations", values);
    },
    onSuccess: () => {
      toast({
        title: "Richiesta inviata",
        description: "La tua richiesta di ferie è stata inviata con successo",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/vacations'] });
      onSuccess?.();
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
    setDate(range);
    if (range?.from) {
      form.setValue("startDate", range.from);
    }
    if (range?.to) {
      form.setValue("endDate", range.to);
    }
  };

  // Form submission
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createVacationMutation.mutate(values);
  };

  return (
    <div className="fixed inset-0 bg-neutral-900 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
        <div className="p-4 border-b border-neutral-200 flex justify-between items-center">
          <h3 className="font-semibold text-lg">Richiedi Ferie</h3>
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
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Periodo</FormLabel>
                    <DateRangePicker
                      date={date}
                      onDateChange={handleDateRangeChange}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={() => <FormItem className="hidden"></FormItem>}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note (opzionale)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Inserisci eventuali note o dettagli aggiuntivi"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="bg-blue-50 p-3 rounded-md">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Nota:</span> Le richieste di ferie devono essere approvate dal caposala
                  e sono soggette alla disponibilità di personale. Ti consigliamo di richiedere le ferie con almeno 
                  2 settimane di anticipo.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-neutral-200 flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={createVacationMutation.isPending}
              >
                Annulla
              </Button>
              <Button
                type="submit"
                disabled={createVacationMutation.isPending}
              >
                {createVacationMutation.isPending ? "Invio..." : "Invia Richiesta"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default VacationForm;

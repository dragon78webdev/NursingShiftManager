import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ScheduleData, ShiftData } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ChangeRequestFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

// Get all shifts for the selected date
const getShiftByDate = (shifts: ShiftData[], date: Date, staffId: number): ShiftData | undefined => {
  const dateStr = format(date, "yyyy-MM-dd");
  return shifts.find(
    (shift) => 
      shift.staffId === staffId && 
      format(new Date(shift.date), "yyyy-MM-dd") === dateStr
  );
};

const ChangeRequestForm = ({ onClose, onSuccess }: ChangeRequestFormProps) => {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Get user data
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
  });

  // Get current month's schedule
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0); // End of next month

  const { data: scheduleData } = useQuery<ScheduleData>({
    queryKey: [`/api/schedule?startDate=${format(startOfMonth, "yyyy-MM-dd")}&endDate=${format(endOfMonth, "yyyy-MM-dd")}`],
  });

  // Form schema
  const formSchema = z.object({
    shiftId: z.number({
      required_error: "Seleziona un turno",
    }),
    requestedShiftType: z.string({
      required_error: "Seleziona il turno richiesto",
    }),
    reason: z.string().min(5, {
      message: "Il motivo deve essere almeno 5 caratteri",
    }),
  });

  // Form setup
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reason: "",
    },
  });

  // Find the current user's staff ID
  const getUserStaffId = (): number | undefined => {
    if (!scheduleData || !user) return undefined;
    
    const staffEntries = Object.entries(scheduleData.staffDetails);
    const userStaffEntry = staffEntries.find(([_, staff]) => staff.name === user.name);
    
    return userStaffEntry ? parseInt(userStaffEntry[0]) : undefined;
  };

  const userStaffId = getUserStaffId();

  // Get selected shift
  const selectedShift = selectedDate && userStaffId 
    ? getShiftByDate(scheduleData?.shifts || [], selectedDate, userStaffId)
    : undefined;

  // Update shiftId field when a date is selected
  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date && userStaffId) {
      const shift = getShiftByDate(scheduleData?.shifts || [], date, userStaffId);
      if (shift) {
        form.setValue("shiftId", shift.id);
      } else {
        form.setValue("shiftId", 0);
      }
    }
  };

  // Create change request mutation
  const createRequestMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      return apiRequest("POST", "/api/change-requests", values);
    },
    onSuccess: () => {
      toast({
        title: "Richiesta inviata",
        description: "La tua richiesta di cambio turno è stata inviata con successo",
      });
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

  // Form submission
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createRequestMutation.mutate(values);
  };

  // Shift type mapping
  const shiftTypes = {
    'M': 'Mattina',
    'P': 'Pomeriggio',
    'N': 'Notte',
    'R': 'Riposo',
    'F': 'Ferie'
  };

  return (
    <div className="fixed inset-0 bg-neutral-900 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
        <div className="p-4 border-b border-neutral-200 flex justify-between items-center">
          <h3 className="font-semibold text-lg">Richiedi Cambio Turno</h3>
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
              <div className="space-y-2">
                <FormLabel>Seleziona data</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      {selectedDate ? (
                        format(selectedDate, "PPP", { locale: { code: "it" } })
                      ) : (
                        <span>Seleziona una data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {selectedShift ? (
                <div className="bg-blue-50 p-3 rounded-md">
                  <p className="text-sm font-medium text-blue-800">
                    Turno attuale: <span className="font-bold">{shiftTypes[selectedShift.shiftType as keyof typeof shiftTypes]}</span>
                  </p>
                </div>
              ) : selectedDate ? (
                <div className="bg-yellow-50 p-3 rounded-md">
                  <p className="text-sm font-medium text-yellow-800">
                    Nessun turno trovato per questa data
                  </p>
                </div>
              ) : null}

              <FormField
                control={form.control}
                name="shiftId"
                render={({ field }) => (
                  <FormItem hidden>
                    <FormControl>
                      <input type="hidden" {...field} value={selectedShift?.id || 0} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requestedShiftType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Turno richiesto</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona il turno richiesto" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="M">Mattina (M)</SelectItem>
                        <SelectItem value="P">Pomeriggio (P)</SelectItem>
                        <SelectItem value="N">Notte (N)</SelectItem>
                        <SelectItem value="R">Riposo (R)</SelectItem>
                        <SelectItem value="F">Ferie (F)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo della richiesta</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Inserisci il motivo della richiesta di cambio turno"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="p-4 border-t border-neutral-200 flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={createRequestMutation.isPending}
              >
                Annulla
              </Button>
              <Button
                type="submit"
                disabled={!selectedShift || createRequestMutation.isPending}
              >
                {createRequestMutation.isPending ? "Invio..." : "Invia Richiesta"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default ChangeRequestForm;

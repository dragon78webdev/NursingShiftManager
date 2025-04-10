import { useState } from "react";
import { X } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { completeProfile } from "@/lib/auth";
import { AuthUser, FirstLoginFormData } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

interface FirstLoginDialogProps {
  onComplete: (user: AuthUser) => void;
  onClose: () => void;
}

const FirstLoginDialog = ({ onComplete, onClose }: FirstLoginDialogProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Define form schema
  const formSchema = z.object({
    role: z.enum(["nurse", "oss", "head_nurse"], {
      required_error: "Seleziona un ruolo",
    }),
    department: z.string().min(1, {
      message: "Seleziona un reparto",
    }),
    facility: z.string().min(1, {
      message: "Seleziona una sede",
    }),
  });

  // Create form
  const form = useForm<FirstLoginFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role: "nurse",
      department: "",
      facility: "",
    },
  });

  // Handle form submission
  const onSubmit = async (data: FirstLoginFormData) => {
    setIsSubmitting(true);
    try {
      const user = await completeProfile(data);
      if (user) {
        toast({
          title: "Profilo completato",
          description: "Il tuo profilo è stato configurato con successo",
        });
        onComplete(user);
      } else {
        throw new Error("Errore durante il completamento del profilo");
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-900 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
        <div className="p-4 border-b border-neutral-200 flex justify-between items-center">
          <h3 className="font-semibold text-lg">Benvenuto in NurseScheduler</h3>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="p-4">
              <div className="text-center mb-4">
                <div className="bg-primary-light inline-flex items-center justify-center p-4 rounded-full mb-3">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-6 w-6 text-primary"
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
                <h4 className="text-lg font-medium">Completa il tuo profilo</h4>
                <p className="text-neutral-600 text-sm">
                  Seleziona il tuo ruolo per configurare l'accesso al sistema
                </p>
              </div>
              
              <div className="space-y-4 mt-6">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seleziona il tuo ruolo</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="space-y-3"
                        >
                          <Card className={`cursor-pointer hover:border-primary transition-colors border-2 ${field.value === "nurse" ? "border-primary" : "border-transparent"}`}>
                            <div className="p-3 flex items-center">
                              <RadioGroupItem value="nurse" id="role-nurse" className="mr-3" />
                              <Label htmlFor="role-nurse" className="flex-1 cursor-pointer">
                                <div className="font-medium">Infermiere</div>
                                <div className="text-sm text-neutral-600">
                                  Accesso alla visualizzazione turni e richieste cambio
                                </div>
                              </Label>
                            </div>
                          </Card>
                          
                          <Card className={`cursor-pointer hover:border-primary transition-colors border-2 ${field.value === "oss" ? "border-primary" : "border-transparent"}`}>
                            <div className="p-3 flex items-center">
                              <RadioGroupItem value="oss" id="role-oss" className="mr-3" />
                              <Label htmlFor="role-oss" className="flex-1 cursor-pointer">
                                <div className="font-medium">OSS</div>
                                <div className="text-sm text-neutral-600">
                                  Accesso alla visualizzazione turni e richieste cambio
                                </div>
                              </Label>
                            </div>
                          </Card>
                          
                          <Card className={`cursor-pointer hover:border-primary transition-colors border-2 ${field.value === "head_nurse" ? "border-primary" : "border-transparent"}`}>
                            <div className="p-3 flex items-center">
                              <RadioGroupItem value="head_nurse" id="role-head" className="mr-3" />
                              <Label htmlFor="role-head" className="flex-1 cursor-pointer">
                                <div className="font-medium">Caposala</div>
                                <div className="text-sm text-neutral-600">
                                  Accesso completo alla gestione turni e personale
                                </div>
                              </Label>
                            </div>
                          </Card>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reparto/Unità</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona reparto" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Medicina Generale">Medicina Generale</SelectItem>
                          <SelectItem value="Chirurgia">Chirurgia</SelectItem>
                          <SelectItem value="Pronto Soccorso">Pronto Soccorso</SelectItem>
                          <SelectItem value="Pediatria">Pediatria</SelectItem>
                          <SelectItem value="Cardiologia">Cardiologia</SelectItem>
                          <SelectItem value="Ortopedia">Ortopedia</SelectItem>
                          <SelectItem value="Neurologia">Neurologia</SelectItem>
                          <SelectItem value="Ginecologia">Ginecologia</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="facility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sede</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona sede" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Ospedale Centrale">Ospedale Centrale</SelectItem>
                          <SelectItem value="Presidio Nord">Presidio Nord</SelectItem>
                          <SelectItem value="Presidio Est">Presidio Est</SelectItem>
                          <SelectItem value="Poliambulatorio">Poliambulatorio</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <div className="p-4 border-t border-neutral-200 flex justify-end">
              <Button 
                type="submit" 
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Elaborazione..." : "Inizia"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default FirstLoginDialog;

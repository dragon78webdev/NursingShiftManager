import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AuthUser } from "@/lib/types";
import { Bell, Moon, Sun, Globe, Shield, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { canInstallPWA, requestNotificationPermission } from "@/lib/pwa";

const Settings = () => {
  const { toast } = useToast();
  
  // State for settings
  const [darkMode, setDarkMode] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [language, setLanguage] = useState("italian");
  
  // Get current user
  const { data: user, isLoading } = useQuery<AuthUser>({
    queryKey: ['/api/auth/user'],
  });
  
  // Check PWA installation status
  const [canInstall, setCanInstall] = useState(false);
  
  // Effect to check if PWA can be installed
  useState(() => {
    setCanInstall(canInstallPWA());
  });
  
  // Request push notification permission
  const handleRequestNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setPushNotifications(true);
      toast({
        title: "Notifiche abilitate",
        description: "Riceverai notifiche push per gli aggiornamenti importanti."
      });
    } else {
      setPushNotifications(false);
      toast({
        title: "Notifiche bloccate",
        description: "Le notifiche sono state bloccate. Puoi modificare questa impostazione nelle preferenze del browser.",
        variant: "destructive"
      });
    }
  };
  
  // Save settings
  const handleSaveSettings = () => {
    toast({
      title: "Impostazioni salvate",
      description: "Le tue preferenze sono state aggiornate con successo."
    });
  };
  
  // PWA install
  const handleInstallPWA = () => {
    toast({
      title: "Installazione PWA",
      description: "Segui le istruzioni del browser per installare l'applicazione."
    });
  };
  
  if (isLoading) {
    return (
      <div className="py-6 space-y-6">
        <div className="animate-pulse h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="py-6 space-y-6">
      <h1 className="text-2xl font-bold">Impostazioni</h1>
      
      <Tabs defaultValue="general">
        <TabsList className="grid w-full md:w-1/3 grid-cols-3">
          <TabsTrigger value="general">Generali</TabsTrigger>
          <TabsTrigger value="notifications">Notifiche</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Aspetto</CardTitle>
              <CardDescription>
                Personalizza l'aspetto dell'applicazione.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Moon className="h-5 w-5 text-gray-500" />
                  <Label htmlFor="dark-mode">Modalità scura</Label>
                </div>
                <Switch
                  id="dark-mode"
                  checked={darkMode}
                  onCheckedChange={setDarkMode}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="language">Lingua</Label>
                <Select
                  value={language}
                  onValueChange={setLanguage}
                >
                  <SelectTrigger id="language" className="w-full">
                    <SelectValue placeholder="Seleziona lingua" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="italian">Italiano</SelectItem>
                    <SelectItem value="english">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Installazione App</CardTitle>
              <CardDescription>
                Installa NurseScheduler come applicazione sul tuo dispositivo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                L'installazione dell'app ti permette di accedere a NurseScheduler direttamente dal tuo dispositivo, anche offline.
              </p>
              <Button
                onClick={handleInstallPWA}
                disabled={!canInstall}
              >
                Installa App
              </Button>
              {!canInstall && (
                <p className="text-xs text-gray-500 mt-2">
                  Questa funzionalità è disponibile solo su browser supportati o quando l'app non è già installata.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notifiche Push</CardTitle>
              <CardDescription>
                Gestisci le notifiche push per l'applicazione.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bell className="h-5 w-5 text-gray-500" />
                  <Label htmlFor="push-notifications">Notifiche push</Label>
                </div>
                <Switch
                  id="push-notifications"
                  checked={pushNotifications}
                  onCheckedChange={setPushNotifications}
                />
              </div>
              
              <div className="pt-2">
                <Button
                  variant="outline"
                  onClick={handleRequestNotifications}
                >
                  Richiedi permesso notifiche
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="email-notifications">Notifiche email</Label>
                </div>
                <Switch
                  id="email-notifications"
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Preferenze di notifica</CardTitle>
              <CardDescription>
                Scegli quali eventi generano notifiche.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="notify-changes">Richieste cambio turno</Label>
                <Switch id="notify-changes" defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="notify-schedules">Nuovi turni generati</Label>
                <Switch id="notify-schedules" defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="notify-vacations">Approvazione ferie</Label>
                <Switch id="notify-vacations" defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="account" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informazioni Personali</CardTitle>
              <CardDescription>
                Gestisci le tue informazioni personali.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input id="name" value={user?.name || ""} disabled />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user?.email || ""} disabled />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">Ruolo</Label>
                <Input 
                  id="role" 
                  value={
                    user?.role === "nurse" ? "Infermiere" : 
                    user?.role === "oss" ? "OSS" : 
                    user?.role === "head_nurse" ? "Caposala" : ""
                  }
                  disabled 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="department">Reparto</Label>
                <Input id="department" value={user?.department || ""} disabled />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="facility">Sede</Label>
                <Input id="facility" value={user?.facility || ""} disabled />
              </div>
            </CardContent>
            <CardFooter>
              <p className="text-sm text-gray-500">
                Per modificare i tuoi dati personali, contatta l'amministratore.
              </p>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Sicurezza</CardTitle>
              <CardDescription>
                Gestisci le impostazioni di sicurezza del tuo account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-4">
                Il tuo account è collegato a Google. Per modificare la password o altre impostazioni di sicurezza, visita il tuo account Google.
              </p>
              <Button variant="outline">
                <Shield className="mr-2 h-4 w-4" />
                Vai alle impostazioni Google
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-end">
        <Button onClick={handleSaveSettings}>
          Salva Impostazioni
        </Button>
      </div>
    </div>
  );
};

export default Settings;

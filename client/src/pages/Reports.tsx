import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths } from "date-fns";
import { it } from "date-fns/locale";
import { BarChart3, PieChart, Download, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RPieChart, Pie, Cell } from "recharts";
import { useToast } from "@/hooks/use-toast";

// Mock data for the example charts
const shiftDistributionData = [
  { name: 'Mattina', value: 32, color: '#3B82F6' },
  { name: 'Pomeriggio', value: 28, color: '#10B981' },
  { name: 'Notte', value: 22, color: '#8B5CF6' },
  { name: 'Riposo', value: 15, color: '#6B7280' },
  { name: 'Ferie', value: 3, color: '#F59E0B' },
];

const monthlyShiftsData = [
  { name: 'Gen', mattina: 100, pomeriggio: 88, notte: 72 },
  { name: 'Feb', mattina: 95, pomeriggio: 90, notte: 75 },
  { name: 'Mar', mattina: 98, pomeriggio: 85, notte: 70 },
  { name: 'Apr', mattina: 105, pomeriggio: 92, notte: 68 },
  { name: 'Mag', mattina: 110, pomeriggio: 95, notte: 72 },
  { name: 'Giu', mattina: 108, pomeriggio: 90, notte: 74 },
];

const Reports = () => {
  const { toast } = useToast();
  const [reportType, setReportType] = useState("shifts");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("6m");

  // This would be replaced with a real API call in a complete implementation
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
  });
  
  // Get period date range
  const getPeriodLabel = () => {
    const today = new Date();
    let startDate;
    
    switch (periodFilter) {
      case "1m":
        startDate = subMonths(today, 1);
        break;
      case "3m":
        startDate = subMonths(today, 3);
        break;
      case "6m":
        startDate = subMonths(today, 6);
        break;
      case "1y":
        startDate = subMonths(today, 12);
        break;
      default:
        startDate = subMonths(today, 6);
    }
    
    return `${format(startDate, 'dd/MM/yyyy', { locale: it })} - ${format(today, 'dd/MM/yyyy', { locale: it })}`;
  };

  // Download report
  const handleDownloadReport = () => {
    toast({
      title: "Report generato",
      description: "Il report è stato scaricato con successo",
    });
  };

  // Get role in Italian
  const getRoleInItalian = (role: string) => {
    switch (role) {
      case 'nurse': return 'Infermieri';
      case 'oss': return 'OSS';
      case 'head_nurse': return 'Caposala';
      default: return 'Tutti';
    }
  };

  return (
    <div className="py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Report</h1>
        <Button onClick={handleDownloadReport}>
          <Download className="mr-2 h-4 w-4" />
          Scarica Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Tipo Report</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={reportType}
              onValueChange={setReportType}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona tipo report" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shifts">Distribuzione Turni</SelectItem>
                <SelectItem value="changes">Cambi Turno</SelectItem>
                <SelectItem value="vacations">Ferie</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Reparto</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={departmentFilter}
              onValueChange={setDepartmentFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona reparto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="medicina">Medicina Generale</SelectItem>
                <SelectItem value="chirurgia">Chirurgia</SelectItem>
                <SelectItem value="ps">Pronto Soccorso</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Periodo</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={periodFilter}
              onValueChange={setPeriodFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona periodo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">Ultimo mese</SelectItem>
                <SelectItem value="3m">Ultimi 3 mesi</SelectItem>
                <SelectItem value="6m">Ultimi 6 mesi</SelectItem>
                <SelectItem value="1y">Ultimo anno</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center">
            <BarChart3 className="h-5 w-5 text-primary mr-2" />
            <h2 className="text-lg font-semibold">Report {reportType === "shifts" ? "Distribuzione Turni" : 
              reportType === "changes" ? "Cambi Turno" : "Ferie"}</h2>
          </div>
          <div className="text-sm text-gray-500">
            {getPeriodLabel()}
          </div>
        </div>
        
        <div className="p-4">
          <div className="mb-4">
            <h3 className="text-lg font-medium">
              {reportType === "shifts" ? "Distribuzione Turni" : 
                reportType === "changes" ? "Cambi Turno" : "Ferie"} - {departmentFilter === "all" ? "Tutti i reparti" : 
                  departmentFilter === "medicina" ? "Medicina Generale" : 
                  departmentFilter === "chirurgia" ? "Chirurgia" : 
                  "Pronto Soccorso"}
            </h3>
            <p className="text-sm text-gray-500">
              {reportType === "shifts" ? 
                "Visualizzazione della distribuzione dei turni per tipologia" : 
                reportType === "changes" ? 
                "Analisi dei cambi turno richiesti e approvati" : 
                "Monitoraggio delle richieste di ferie e permessi"}
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80">
              <h4 className="text-sm font-medium mb-2 text-gray-700">Distribuzione per tipo</h4>
              <ResponsiveContainer width="100%" height="100%">
                <RPieChart>
                  <Pie
                    data={shiftDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {shiftDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} turni`, 'Quantità']} />
                  <Legend />
                </RPieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="h-80">
              <h4 className="text-sm font-medium mb-2 text-gray-700">Trend mensile</h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyShiftsData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="mattina" name="Mattina" fill="#3B82F6" />
                  <Bar dataKey="pomeriggio" name="Pomeriggio" fill="#10B981" />
                  <Bar dataKey="notte" name="Notte" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Richieste cambio turno</CardTitle>
            <CardDescription>
              Statistiche sulle richieste di cambio turno
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex space-x-8">
              <div>
                <p className="text-3xl font-bold text-primary">87%</p>
                <p className="text-sm text-gray-500">Tasso di approvazione</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-yellow-500">12</p>
                <p className="text-sm text-gray-500">In attesa</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-green-500">82</p>
                <p className="text-sm text-gray-500">Approvate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Copertura turni</CardTitle>
            <CardDescription>
              Analisi della copertura dei turni per tipo
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Mattina</span>
                  <span className="text-sm text-gray-500">98%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '98%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Pomeriggio</span>
                  <span className="text-sm text-gray-500">92%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-green-600 h-2.5 rounded-full" style={{ width: '92%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Notte</span>
                  <span className="text-sm text-gray-500">85%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval,
  isSameMonth
} from "date-fns";
import { it } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ScheduleData, ShiftData } from "@/lib/types";
import { downloadSchedulePdf } from "@/lib/pdf";
import { useToast } from "@/hooks/use-toast";

// Mapping for shift types
const SHIFT_TYPES = {
  M: { label: "Mattina", className: "bg-blue-100 text-blue-800" },
  P: { label: "Pomeriggio", className: "bg-green-100 text-green-800" },
  N: { label: "Notte", className: "bg-purple-100 text-purple-800" },
  R: { label: "Riposo", className: "bg-gray-100 text-gray-800" },
  F: { label: "Ferie", className: "bg-yellow-100 text-yellow-800" }
};

const ScheduleView = () => {
  const { toast } = useToast();
  
  // View state
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [staffFilter, setStaffFilter] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);
  
  // Calculate month range
  const firstDayOfMonth = startOfMonth(currentMonth);
  const lastDayOfMonth = endOfMonth(currentMonth);
  
  // Format dates for query
  const startDateStr = format(firstDayOfMonth, "yyyy-MM-dd");
  const endDateStr = format(lastDayOfMonth, "yyyy-MM-dd");
  
  // Fetch schedule data
  const { data, isLoading, error } = useQuery<ScheduleData>({
    queryKey: [`/api/schedule?startDate=${startDateStr}&endDate=${endDateStr}`],
  });
  
  // Navigation handlers
  const goToPreviousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };
  
  const goToNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };
  
  // Generate days of the month
  const daysOfMonth = eachDayOfInterval({
    start: firstDayOfMonth,
    end: lastDayOfMonth
  });
  
  // Group shifts by staff
  const getShiftsByStaff = () => {
    if (!data) return [];
    
    let staffIds = Object.keys(data.staffDetails).map(id => parseInt(id));
    
    // Apply staff filter
    if (staffFilter !== "all") {
      const staffRole = staffFilter;
      staffIds = staffIds.filter(id => data.staffDetails[id].role === staffRole);
    }
    
    return staffIds.map(staffId => {
      const staffMember = data.staffDetails[staffId];
      
      // Get shifts for this staff member
      const staffShifts = data.shifts.filter(shift => shift.staffId === staffId);
      
      // Organize shifts by date
      const shiftsByDate: Record<string, ShiftData | undefined> = {};
      
      staffShifts.forEach(shift => {
        // Use date string as key
        const shiftDate = format(new Date(shift.date), "yyyy-MM-dd");
        shiftsByDate[shiftDate] = shift;
      });
      
      return {
        staff: staffMember,
        shiftsByDate
      };
    });
  };
  
  // Get shift for given staff and date
  const getShiftCell = (shiftsByDate: Record<string, ShiftData | undefined>, date: Date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    const shift = shiftsByDate[dateKey];
    
    if (!shift) return null;
    
    const shiftType = shift.shiftType as keyof typeof SHIFT_TYPES;
    const isChanged = shift.changed;
    
    return (
      <div className={`text-center font-medium rounded px-2 py-1 ${SHIFT_TYPES[shiftType].className} ${isChanged ? "ring-2 ring-yellow-400" : ""}`}>
        {shiftType}
      </div>
    );
  };
  
  // Export schedule to PDF
  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      await downloadSchedulePdf(
        firstDayOfMonth,
        lastDayOfMonth,
        staffFilter === "oss" ? "oss" : "nurse"
      );
      toast({
        title: "PDF generato",
        description: "Il PDF è stato generato e scaricato con successo"
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la generazione del PDF",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-gray-200 rounded w-1/3 mb-6"></div>
        <div className="h-12 bg-gray-200 rounded mb-6"></div>
        <div className="space-y-4">
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-lg">
        <h3 className="font-bold">Errore</h3>
        <p>Si è verificato un errore durante il caricamento dei dati.</p>
      </div>
    );
  }
  
  const staffWithShifts = getShiftsByStaff();
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Gestione Turni</h1>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleExportPdf}
            disabled={isExporting}
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? "Esportazione..." : "Esporta PDF"}
          </Button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPreviousMonth}
              className="text-gray-500"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center mx-2">
              <Calendar className="h-5 w-5 mr-2 text-primary" />
              <h2 className="text-lg font-semibold">
                {format(currentMonth, "MMMM yyyy", { locale: it })}
              </h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNextMonth}
              className="text-gray-500"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Filtra per:</span>
            <Select
              value={staffFilter}
              onValueChange={setStaffFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Seleziona ruolo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="nurse">Infermieri</SelectItem>
                <SelectItem value="oss">OSS</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <div className="min-w-max p-4">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="w-48 sticky left-0 bg-white z-10 px-4 py-2 text-left font-semibold text-gray-700 border-b border-gray-200">
                    Personale
                  </th>
                  {daysOfMonth.map((day, index) => (
                    <th
                      key={index}
                      className={`text-center px-2 py-2 font-semibold text-gray-700 border-b border-gray-200 ${
                        day.getDay() === 0 || day.getDay() === 6
                          ? "bg-gray-50"
                          : ""
                      }`}
                    >
                      <div className="text-sm">{format(day, "EEE", { locale: it })}</div>
                      <div>{format(day, "d")}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staffWithShifts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={daysOfMonth.length + 1}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      Nessun dato disponibile per il periodo selezionato
                    </td>
                  </tr>
                ) : (
                  staffWithShifts.map((staffItem, staffIndex) => (
                    <tr
                      key={staffIndex}
                      className={staffIndex % 2 === 1 ? "bg-gray-50" : ""}
                    >
                      <td className="sticky left-0 bg-inherit z-10 px-4 py-2 border-b border-gray-200">
                        <div className="font-medium">{staffItem.staff.name}</div>
                        <Badge
                          variant={
                            staffItem.staff.role === "head_nurse"
                              ? "default"
                              : staffItem.staff.role === "nurse"
                              ? "secondary"
                              : "outline"
                          }
                          className="mt-1"
                        >
                          {staffItem.staff.role === "nurse"
                            ? "Infermiere"
                            : staffItem.staff.role === "oss"
                            ? "OSS"
                            : "Caposala"}
                        </Badge>
                      </td>
                      {daysOfMonth.map((day, dayIndex) => (
                        <td
                          key={dayIndex}
                          className={`text-center px-2 py-2 border-b border-gray-200 ${
                            day.getDay() === 0 || day.getDay() === 6
                              ? "bg-gray-50"
                              : ""
                          }`}
                        >
                          {getShiftCell(staffItem.shiftsByDate, day)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            
            <div className="flex flex-wrap gap-4 mt-4">
              {Object.entries(SHIFT_TYPES).map(([key, { label, className }]) => (
                <div key={key} className="flex items-center space-x-1">
                  <div className={`w-6 h-6 rounded flex items-center justify-center ${className}`}>
                    {key}
                  </div>
                  <span className="text-sm text-gray-600">{label}</span>
                </div>
              ))}
              <div className="flex items-center space-x-1">
                <div className="w-6 h-6 rounded flex items-center justify-center bg-blue-100 text-blue-800 ring-2 ring-yellow-400">
                  M
                </div>
                <span className="text-sm text-gray-600">Turno cambiato</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleView;

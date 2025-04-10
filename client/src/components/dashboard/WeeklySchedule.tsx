import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, addDays, subDays } from "date-fns";
import { it } from "date-fns/locale";
import { ScheduleData, ShiftData } from "@/lib/types";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Mapping for shift types
const SHIFT_TYPES = {
  M: { label: "Mattina", className: "bg-blue-100 text-blue-800" },
  P: { label: "Pomeriggio", className: "bg-green-100 text-green-800" },
  N: { label: "Notte", className: "bg-purple-100 text-purple-800" },
  R: { label: "Riposo", className: "bg-gray-100 text-gray-800" },
  F: { label: "Ferie", className: "bg-yellow-100 text-yellow-800" }
};

// Utility to get Monday of current week
const getMondayOfCurrentWeek = () => {
  const today = new Date();
  const day = today.getDay();
  // getDay returns 0 for Sunday, so use 7 for it to get previous Monday
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(today.setDate(diff));
};

// Format date range as string (e.g. "19-25 Giugno 2023")
const formatDateRange = (startDate: Date, endDate: Date) => {
  const start = format(startDate, "d", { locale: it });
  const end = format(endDate, "d MMMM yyyy", { locale: it });
  return `${start}-${end}`;
};

const WeeklySchedule = () => {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getMondayOfCurrentWeek());

  // Calculate week end date (Sunday)
  const currentWeekEnd = addDays(currentWeekStart, 6);
  
  // Format dates for query
  const startDateStr = format(currentWeekStart, "yyyy-MM-dd");
  const endDateStr = format(currentWeekEnd, "yyyy-MM-dd");

  // Fetch weekly schedule data
  const { data, isLoading, error } = useQuery<ScheduleData>({
    queryKey: [`/api/schedule?startDate=${startDateStr}&endDate=${endDateStr}`],
  });

  // Handler for previous week navigation
  const goToPreviousWeek = () => {
    setCurrentWeekStart(prev => subDays(prev, 7));
  };

  // Handler for next week navigation
  const goToNextWeek = () => {
    setCurrentWeekStart(prev => addDays(prev, 7));
  };

  // Generate weekday headers
  const weekDays = Array.from({ length: 7 }).map((_, index) => {
    const date = addDays(currentWeekStart, index);
    const dayNumber = format(date, "d", { locale: it });
    const dayName = format(date, "EEE", { locale: it });
    return { dayNumber, dayName, date };
  });

  // Group shifts by staff
  const getShiftsByStaff = () => {
    if (!data) return [];

    const staffIds = Object.keys(data.staffDetails);
    
    return staffIds.map(staffId => {
      const numericStaffId = parseInt(staffId);
      const staffMember = data.staffDetails[numericStaffId];
      
      // Get shifts for this staff member
      const staffShifts = data.shifts.filter(shift => shift.staffId === numericStaffId);
      
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
      <div className={`shift-cell text-center font-medium rounded px-2 py-1 ${SHIFT_TYPES[shiftType].className} ${isChanged ? "ring-2 ring-yellow-400" : ""}`}>
        {shiftType}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-sm p-6">
        <p className="text-red-500">Errore nel caricamento dei turni</p>
      </div>
    );
  }

  const staffWithShifts = getShiftsByStaff();

  return (
    <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-sm">
      <div className="flex justify-between items-center p-4 border-b border-neutral-200 bg-neutral-50">
        <h2 className="text-lg font-semibold text-neutral-800">Pianificazione Settimanale</h2>
        <div className="flex items-center">
          <button 
            onClick={goToPreviousWeek}
            className="text-primary hover:bg-neutral-100 p-1 rounded"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm text-neutral-700 mx-2">
            {formatDateRange(currentWeekStart, currentWeekEnd)}
          </span>
          <button 
            onClick={goToNextWeek}
            className="text-primary hover:bg-neutral-100 p-1 rounded"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      <div className="p-4 overflow-x-auto">
        <div className="min-w-[600px]">
          <div className="border border-neutral-200 rounded-md overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="w-1/5 px-4 py-3 text-left font-semibold text-neutral-700 bg-neutral-100 border-b border-neutral-200">
                    Personale
                  </th>
                  {weekDays.map((day, index) => (
                    <th 
                      key={index} 
                      className="text-center px-4 py-3 font-semibold text-neutral-700 bg-neutral-100 border-b border-neutral-200"
                    >
                      <div>{day.dayName} {day.dayNumber}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staffWithShifts.map((staffItem, staffIndex) => (
                  <tr key={staffIndex} className={staffIndex % 2 === 1 ? "bg-neutral-50" : ""}>
                    <td className="px-4 py-2 border-b border-neutral-200 font-medium">
                      {staffItem.staff.name}
                    </td>
                    {weekDays.map((day, dayIndex) => (
                      <td key={dayIndex} className="text-center px-4 py-2 border-b border-neutral-200">
                        {getShiftCell(staffItem.shiftsByDate, day.date)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="flex flex-wrap space-x-2 mt-3 justify-end">
            {Object.entries(SHIFT_TYPES).map(([key, { label, className }]) => (
              <div key={key} className="flex items-center space-x-1 mb-1">
                <div className={`shift-cell w-6 text-center ${className}`}>{key}</div>
                <span className="text-xs text-neutral-600">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklySchedule;

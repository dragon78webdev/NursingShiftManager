import React, { useState } from 'react';
import { Schedule, ShiftType, Staff, User } from '@shared/schema';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, startOfWeek, addDays, differenceInDays, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import ShiftLegend from './shift-legend';

type ScheduleWithStaff = Schedule & { staff: Staff & { user: User } };

interface ScheduleCalendarProps {
  schedules: ScheduleWithStaff[];
  startDate: Date;
  endDate: Date;
  onDateRangeChange: (startDate: Date, endDate: Date) => void;
}

export function ScheduleCalendar({ 
  schedules, 
  startDate,
  endDate,
  onDateRangeChange
}: ScheduleCalendarProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    // If provided start date is in the past, use it, otherwise use current week
    const today = new Date();
    const providedStart = new Date(startDate);
    return providedStart < today ? providedStart : startOfWeek(today, { weekStartsOn: 1 });
  });

  // Generate array of 7 days from the week start
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  // Go to previous week
  const prevWeek = () => {
    const newWeekStart = addDays(currentWeekStart, -7);
    setCurrentWeekStart(newWeekStart);
    onDateRangeChange(newWeekStart, addDays(newWeekStart, 6));
  };

  // Go to next week
  const nextWeek = () => {
    const newWeekStart = addDays(currentWeekStart, 7);
    setCurrentWeekStart(newWeekStart);
    onDateRangeChange(newWeekStart, addDays(newWeekStart, 6));
  };

  // Group schedules by staff member
  const schedulesByStaff = schedules.reduce((acc, schedule) => {
    const staffId = schedule.staffId;
    if (!acc[staffId]) {
      acc[staffId] = {
        staff: schedule.staff,
        shifts: {}
      };
    }
    
    // Use date string as key
    const dateStr = format(new Date(schedule.date), 'yyyy-MM-dd');
    acc[staffId].shifts[dateStr] = schedule;
    
    return acc;
  }, {} as Record<number, { 
    staff: Staff & { user: User }, 
    shifts: Record<string, Schedule> 
  }>);

  // Sort staff members by name
  const sortedStaffKeys = Object.keys(schedulesByStaff).sort((a, b) => {
    const staffA = schedulesByStaff[Number(a)].staff.user.name;
    const staffB = schedulesByStaff[Number(b)].staff.user.name;
    return staffA.localeCompare(staffB);
  });

  // Helper function to get shift style
  const getShiftClass = (shiftType: ShiftType) => {
    switch (shiftType) {
      case ShiftType.MORNING:
        return 'bg-blue-50 border-l-4 border-blue-500';
      case ShiftType.AFTERNOON:
        return 'bg-yellow-50 border-l-4 border-yellow-500';
      case ShiftType.NIGHT:
        return 'bg-purple-50 border-l-4 border-purple-700';
      case ShiftType.OFF:
        return 'bg-gray-50 border-l-4 border-gray-500';
      case ShiftType.VACATION:
        return 'bg-green-50 border-l-4 border-green-500';
      case ShiftType.SICK:
        return 'bg-red-50 border-l-4 border-red-500';
      default:
        return 'bg-gray-50';
    }
  };

  // Helper function to map shift type to display letter
  const getShiftLetter = (shiftType: ShiftType) => {
    switch (shiftType) {
      case ShiftType.MORNING:
        return 'M';
      case ShiftType.AFTERNOON:
        return 'P';
      case ShiftType.NIGHT:
        return 'N';
      case ShiftType.OFF:
        return 'R';
      case ShiftType.VACATION:
        return 'F';
      case ShiftType.SICK:
        return 'M';
      default:
        return '-';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <div className="font-medium">
          {format(currentWeekStart, 'dd MMMM', { locale: it })} - {format(addDays(currentWeekStart, 6), 'dd MMMM yyyy', { locale: it })}
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={prevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={nextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="bg-gray-50 min-w-[200px]">Personale</TableHead>
              {weekDays.map((day, index) => (
                <TableHead 
                  key={index} 
                  className={cn(
                    "text-center bg-gray-50 min-w-[100px]",
                    format(day, 'EEEE', { locale: it }) === 'domenica' ? 'text-red-600' : ''
                  )}
                >
                  <div>{format(day, 'EEEE', { locale: it })}</div>
                  <div className="font-normal">{format(day, 'dd/MM')}</div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedStaffKeys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-gray-500">
                  Nessun turno trovato per questo periodo
                </TableCell>
              </TableRow>
            ) : (
              sortedStaffKeys.map((staffKey) => {
                const staffData = schedulesByStaff[Number(staffKey)];
                
                return (
                  <TableRow key={staffKey}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarImage 
                            src={staffData.staff.user.avatar || ''} 
                            alt={staffData.staff.user.name} 
                          />
                          <AvatarFallback>
                            {staffData.staff.user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium">{staffData.staff.user.name}</div>
                          <div className="text-xs text-gray-500">
                            {staffData.staff.user.role === 'nurse' ? 'Infermiere' : 'OSS'}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    
                    {weekDays.map((day, index) => {
                      const dateKey = format(day, 'yyyy-MM-dd');
                      const shift = staffData.shifts[dateKey];
                      
                      return (
                        <TableCell key={index} className="text-center p-0">
                          {shift ? (
                            <div className={cn(
                              "py-2 px-2 m-1 rounded text-sm",
                              getShiftClass(shift.shiftType as ShiftType)
                            )}>
                              {getShiftLetter(shift.shiftType as ShiftType)}
                            </div>
                          ) : (
                            <div className="py-2 px-2 m-1 bg-gray-50 rounded text-sm">-</div>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="p-4 border-t border-gray-200">
        <ShiftLegend />
      </div>
    </div>
  );
}

export default ScheduleCalendar;

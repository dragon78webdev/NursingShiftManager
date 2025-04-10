import { 
  Staff, User, ShiftType, Schedule, ContractType, StaffStatus
} from '@shared/schema';

// Configuration options for schedule generation
interface ScheduleGenerationOptions {
  considerVacations: boolean;
  considerPartTime: boolean;
  distributeNightShifts: boolean;
  avoidConsecutiveNights: boolean;
}

// Default options
const defaultOptions: ScheduleGenerationOptions = {
  considerVacations: true,
  considerPartTime: true,
  distributeNightShifts: true,
  avoidConsecutiveNights: true
};

// Staff with shift history used during generation
interface StaffWithHistory {
  staff: Staff & { user: User };
  shifts: Map<string, ShiftType>;
  totalShifts: number;
  nightShifts: number;
  consecutiveNights: number;
}

/**
 * Generate a schedule for staff members over a date range
 */
export function generateSchedule(
  staffMembers: (Staff & { user: User })[],
  startDate: Date,
  endDate: Date,
  options: Partial<ScheduleGenerationOptions> = {}
): Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>[] {
  // Merge options with defaults
  const fullOptions: ScheduleGenerationOptions = {
    ...defaultOptions,
    ...options
  };
  
  // Filter out staff members on vacation or sick leave if considerVacations is true
  const availableStaff = fullOptions.considerVacations
    ? staffMembers.filter(staff => staff.status !== StaffStatus.VACATION && staff.status !== StaffStatus.SICK)
    : [...staffMembers];
  
  // Initialize staff with history
  const staffWithHistory: StaffWithHistory[] = availableStaff.map(staff => ({
    staff,
    shifts: new Map(),
    totalShifts: 0,
    nightShifts: 0,
    consecutiveNights: 0
  }));
  
  // Generate dates in the range
  const dates: Date[] = [];
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Calculate how many staff needed per shift based on total staff
  const staffCount = availableStaff.length;
  const morningStaffCount = Math.ceil(staffCount * 0.4);
  const afternoonStaffCount = Math.ceil(staffCount * 0.3);
  const nightStaffCount = Math.ceil(staffCount * 0.2);
  // The rest will be off duty
  
  // Generate schedules
  const generatedSchedules: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  
  // Process each date
  for (const date of dates) {
    const dateKey = date.toISOString().split('T')[0];
    
    // Sort staff by number of shifts (ascending) to distribute fairly
    staffWithHistory.sort((a, b) => {
      // Consider part-time if enabled
      if (fullOptions.considerPartTime) {
        // Calculate target shifts based on part-time percentage
        const aTarget = a.staff.contractType === ContractType.PART_TIME && a.staff.partTimePercentage
          ? a.staff.partTimePercentage / 100
          : 1;
        
        const bTarget = b.staff.contractType === ContractType.PART_TIME && b.staff.partTimePercentage
          ? b.staff.partTimePercentage / 100
          : 1;
        
        // Compare the ratio of assigned shifts to target
        return (a.totalShifts / aTarget) - (b.totalShifts / bTarget);
      }
      
      // Otherwise just sort by total shifts
      return a.totalShifts - b.totalShifts;
    });
    
    // Generate morning shifts
    const morningStaff = staffWithHistory.slice(0, morningStaffCount);
    for (const staff of morningStaff) {
      staff.shifts.set(dateKey, ShiftType.MORNING);
      staff.totalShifts += 1;
      staff.consecutiveNights = 0; // Reset consecutive nights
      
      generatedSchedules.push({
        staffId: staff.staff.id,
        date,
        shiftType: ShiftType.MORNING,
        generatedBy: 0 // Will be replaced with actual user ID when saving
      });
    }
    
    // Remove morning staff from available pool for this day
    const remainingStaff = staffWithHistory.filter(staff => !staff.shifts.has(dateKey));
    
    // Generate afternoon shifts
    remainingStaff.sort((a, b) => a.totalShifts - b.totalShifts);
    const afternoonStaff = remainingStaff.slice(0, afternoonStaffCount);
    for (const staff of afternoonStaff) {
      staff.shifts.set(dateKey, ShiftType.AFTERNOON);
      staff.totalShifts += 1;
      staff.consecutiveNights = 0; // Reset consecutive nights
      
      generatedSchedules.push({
        staffId: staff.staff.id,
        date,
        shiftType: ShiftType.AFTERNOON,
        generatedBy: 0
      });
    }
    
    // Remove afternoon staff from available pool for this day
    const remainingForNight = remainingStaff.filter(staff => !staff.shifts.has(dateKey));
    
    // Generate night shifts
    if (fullOptions.distributeNightShifts) {
      // Sort by number of night shifts to distribute fairly
      remainingForNight.sort((a, b) => a.nightShifts - b.nightShifts);
    } else {
      // Sort by total shifts
      remainingForNight.sort((a, b) => a.totalShifts - b.totalShifts);
    }
    
    // If avoidConsecutiveNights is enabled, prioritize staff without consecutive nights
    if (fullOptions.avoidConsecutiveNights) {
      remainingForNight.sort((a, b) => {
        if (a.consecutiveNights > 0 && b.consecutiveNights === 0) return 1;
        if (a.consecutiveNights === 0 && b.consecutiveNights > 0) return -1;
        return a.nightShifts - b.nightShifts;
      });
    }
    
    const nightStaff = remainingForNight.slice(0, nightStaffCount);
    for (const staff of nightStaff) {
      staff.shifts.set(dateKey, ShiftType.NIGHT);
      staff.totalShifts += 1;
      staff.nightShifts += 1;
      staff.consecutiveNights += 1;
      
      generatedSchedules.push({
        staffId: staff.staff.id,
        date,
        shiftType: ShiftType.NIGHT,
        generatedBy: 0
      });
    }
    
    // Remaining staff are off duty
    const offDutyStaff = staffWithHistory.filter(staff => !staff.shifts.has(dateKey));
    for (const staff of offDutyStaff) {
      staff.shifts.set(dateKey, ShiftType.OFF);
      staff.consecutiveNights = 0; // Reset consecutive nights
      
      generatedSchedules.push({
        staffId: staff.staff.id,
        date,
        shiftType: ShiftType.OFF,
        generatedBy: 0
      });
    }
  }
  
  return generatedSchedules;
}

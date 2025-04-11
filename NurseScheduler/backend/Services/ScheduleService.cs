using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using NurseScheduler.Models;
using NurseScheduler.Repositories;

namespace NurseScheduler.Services
{
    public class ScheduleService : IScheduleService
    {
        private readonly IShiftRepository _shiftRepository;
        private readonly IStaffRepository _staffRepository;
        private readonly IUserRepository _userRepository;
        
        public ScheduleService(
            IShiftRepository shiftRepository, 
            IStaffRepository staffRepository,
            IUserRepository userRepository)
        {
            _shiftRepository = shiftRepository;
            _staffRepository = staffRepository;
            _userRepository = userRepository;
        }

        public async Task<IEnumerable<Shift>> GetScheduleByDateRangeAsync(DateTime startDate, DateTime endDate)
        {
            return await _shiftRepository.GetByDateRangeAsync(startDate, endDate);
        }

        public async Task<IEnumerable<Shift>> GetScheduleByStaffIdAsync(int staffId, DateTime startDate, DateTime endDate)
        {
            return await _shiftRepository.GetByStaffAndDateRangeAsync(staffId, startDate, endDate);
        }

        public async Task<IEnumerable<Shift>> GetScheduleByRoleAsync(Role role, DateTime startDate, DateTime endDate)
        {
            return await _shiftRepository.GetByRoleAndDateRangeAsync(role, startDate, endDate);
        }

        public async Task<IEnumerable<Shift>> GetScheduleByDepartmentAsync(string department, DateTime startDate, DateTime endDate)
        {
            return await _shiftRepository.GetByDepartmentAndDateRangeAsync(department, startDate, endDate);
        }

        public async Task<bool> UpdateShiftAsync(int shiftId, ShiftType newShiftType)
        {
            var shift = await _shiftRepository.GetByIdAsync(shiftId);
            if (shift == null)
                return false;
                
            shift.ShiftType = newShiftType;
            return await _shiftRepository.UpdateAsync(shift);
        }

        public async Task<int> GenerateScheduleAsync(DateTime startDate, DateTime endDate, Role staffType, string department, int createdById)
        {
            // Get all active staff of the given role and department
            var allStaff = await _staffRepository.GetByRoleAsync(staffType);
            var departmentStaff = allStaff.Where(s => s.Department == department && s.IsActive).ToList();
            
            if (!departmentStaff.Any())
                return 0;
                
            // Check if there are any shifts already generated for this period
            var existingShifts = await _shiftRepository.GetByDepartmentAndDateRangeAsync(department, startDate, endDate);
            if (existingShifts.Any())
            {
                // Delete existing shifts if any
                foreach (var shift in existingShifts)
                {
                    await _shiftRepository.DeleteAsync(shift.Id);
                }
            }
            
            // Generate new shifts
            var shifts = new List<Shift>();
            var totalDays = (int)(endDate - startDate).TotalDays + 1;
            var staffCount = departmentStaff.Count;
            
            // Simple rotation-based scheduling algorithm
            for (int dayIndex = 0; dayIndex < totalDays; dayIndex++)
            {
                var currentDate = startDate.AddDays(dayIndex);
                var isWeekend = currentDate.DayOfWeek == DayOfWeek.Saturday || currentDate.DayOfWeek == DayOfWeek.Sunday;
                
                for (int staffIndex = 0; staffIndex < staffCount; staffIndex++)
                {
                    var staff = departmentStaff[staffIndex];
                    
                    // Assign shift type based on rotation pattern
                    // This is a simplified algorithm - in a real system this would need to consider 
                    // vacations, part-time status, staff preferences, etc.
                    ShiftType shiftType;
                    
                    if (isWeekend && (staffIndex % 3 == dayIndex % 3))
                    {
                        shiftType = ShiftType.Holiday;
                    }
                    else
                    {
                        // Simple rotation: Morning -> Afternoon -> Night -> Rest -> Morning...
                        int rotation = (staffIndex + dayIndex) % 4;
                        shiftType = rotation switch
                        {
                            0 => ShiftType.Morning,
                            1 => ShiftType.Afternoon,
                            2 => ShiftType.Night,
                            _ => ShiftType.Rest
                        };
                        
                        // Part-time staff get more rest days
                        if (staff.IsPartTime && rotation == 3)
                        {
                            shiftType = ShiftType.Rest;
                        }
                    }
                    
                    shifts.Add(new Shift
                    {
                        StaffId = staff.Id,
                        Date = currentDate,
                        ShiftType = shiftType,
                        CreatedById = createdById
                    });
                }
            }
            
            // Create a schedule generation record
            var scheduleGeneration = new ScheduleGeneration
            {
                CreatedById = createdById,
                StartDate = startDate,
                EndDate = endDate,
                StaffType = staffType,
                Department = department,
                CreatedAt = DateTime.UtcNow
            };
            
            // Bulk create all shifts
            return await _shiftRepository.BulkCreateAsync(shifts);
        }

        public async Task<byte[]> GeneratePdfAsync(DateTime startDate, DateTime endDate, Role staffType)
        {
            // This would typically use a PDF generation library like iTextSharp, PDFsharp, etc.
            // Here we're just creating a placeholder implementation
            var shifts = await _shiftRepository.GetByRoleAndDateRangeAsync(staffType, startDate, endDate);
            
            // Get staff information for all shifts
            var staffIds = shifts.Select(s => s.StaffId).Distinct().ToList();
            var staffMembers = new List<Staff>();
            
            foreach (var staffId in staffIds)
            {
                var staff = await _staffRepository.GetByIdAsync(staffId);
                if (staff != null)
                {
                    var user = await _userRepository.GetByIdAsync(staff.UserId);
                    if (user != null)
                    {
                        staff.User = user;
                        staffMembers.Add(staff);
                    }
                }
            }
            
            // In a real implementation, we would create a PDF here
            // For now, we're just returning a placeholder byte array
            return File.ReadAllBytes("NurseScheduler/backend/placeholder-schedule.pdf");
        }
    }
}
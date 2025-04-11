using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using NurseScheduler.Models;

namespace NurseScheduler.Services
{
    public interface IScheduleService
    {
        Task<IEnumerable<Shift>> GetScheduleByDateRangeAsync(DateTime startDate, DateTime endDate);
        Task<IEnumerable<Shift>> GetScheduleByStaffIdAsync(int staffId, DateTime startDate, DateTime endDate);
        Task<IEnumerable<Shift>> GetScheduleByRoleAsync(Role role, DateTime startDate, DateTime endDate);
        Task<IEnumerable<Shift>> GetScheduleByDepartmentAsync(string department, DateTime startDate, DateTime endDate);
        Task<bool> UpdateShiftAsync(int shiftId, ShiftType newShiftType);
        Task<int> GenerateScheduleAsync(DateTime startDate, DateTime endDate, Role staffType, string department, int createdById);
        Task<byte[]> GeneratePdfAsync(DateTime startDate, DateTime endDate, Role staffType);
    }
}
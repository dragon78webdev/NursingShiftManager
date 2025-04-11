using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using NurseScheduler.Models;

namespace NurseScheduler.Repositories
{
    public interface IShiftRepository : IGenericRepository<Shift>
    {
        Task<IEnumerable<Shift>> GetByStaffIdAsync(int staffId);
        Task<IEnumerable<Shift>> GetByDateRangeAsync(DateTime startDate, DateTime endDate);
        Task<IEnumerable<Shift>> GetByStaffAndDateRangeAsync(int staffId, DateTime startDate, DateTime endDate);
        Task<IEnumerable<Shift>> GetByRoleAndDateRangeAsync(Role role, DateTime startDate, DateTime endDate);
        Task<IEnumerable<Shift>> GetByDepartmentAndDateRangeAsync(string department, DateTime startDate, DateTime endDate);
        Task<int> BulkCreateAsync(IEnumerable<Shift> shifts);
    }
}
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using NurseScheduler.Models;

namespace NurseScheduler.Repositories
{
    public interface IVacationRepository : IGenericRepository<Vacation>
    {
        Task<IEnumerable<Vacation>> GetByStaffIdAsync(int staffId);
        Task<IEnumerable<Vacation>> GetByDateRangeAsync(DateTime startDate, DateTime endDate);
        Task<IEnumerable<Vacation>> GetByStaffAndDateRangeAsync(int staffId, DateTime startDate, DateTime endDate);
    }
}
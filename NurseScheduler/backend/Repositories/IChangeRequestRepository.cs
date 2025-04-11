using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using NurseScheduler.Models;

namespace NurseScheduler.Repositories
{
    public interface IChangeRequestRepository : IGenericRepository<ChangeRequest>
    {
        Task<IEnumerable<ChangeRequest>> GetByStaffIdAsync(int staffId);
        Task<IEnumerable<ChangeRequest>> GetByStatusAsync(RequestStatus status);
        Task<IEnumerable<ChangeRequest>> GetByDateRangeAsync(DateTime startDate, DateTime endDate);
        Task<IEnumerable<ChangeRequest>> GetActiveRequestsAsync();
    }
}
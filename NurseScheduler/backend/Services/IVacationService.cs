using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using NurseScheduler.Models;

namespace NurseScheduler.Services
{
    public interface IVacationService
    {
        Task<IEnumerable<Vacation>> GetVacationsByStaffIdAsync(int staffId);
        Task<IEnumerable<Vacation>> GetVacationsByDateRangeAsync(DateTime startDate, DateTime endDate);
        Task<Vacation?> GetVacationByIdAsync(int id);
        Task<bool> CreateVacationAsync(Vacation vacation);
        Task<bool> UpdateVacationAsync(Vacation vacation);
        Task<bool> DeleteVacationAsync(int id);
        Task<bool> ApproveVacationAsync(int id, int approvedById);
    }
}
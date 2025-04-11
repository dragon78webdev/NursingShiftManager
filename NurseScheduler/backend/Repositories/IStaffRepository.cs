using System.Collections.Generic;
using System.Threading.Tasks;
using NurseScheduler.Models;

namespace NurseScheduler.Repositories
{
    public interface IStaffRepository : IGenericRepository<Staff>
    {
        Task<Staff?> GetByUserIdAsync(int userId);
        Task<IEnumerable<Staff>> GetByRoleAsync(Role role);
        Task<IEnumerable<Staff>> GetByDepartmentAsync(string department);
        Task<IEnumerable<Staff>> GetActiveStaffAsync();
        Task<IEnumerable<Staff>> GetStaffWithUserAsync();
    }
}
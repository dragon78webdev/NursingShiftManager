using System.Collections.Generic;
using System.Threading.Tasks;
using NurseScheduler.Models;

namespace NurseScheduler.Repositories
{
    public interface IUserRepository : IGenericRepository<User>
    {
        Task<User?> GetByEmailAsync(string email);
        Task<User?> GetByGoogleIdAsync(string googleId);
        Task<IEnumerable<User>> GetByRoleAsync(Role role);
        Task<bool> UpdatePasswordAsync(int userId, string passwordHash);
        Task<bool> UpdateFirstLoginStatusAsync(int userId, bool isFirstLogin);
    }
}
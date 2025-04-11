using System.Collections.Generic;
using System.Threading.Tasks;
using NurseScheduler.Models;

namespace NurseScheduler.Services
{
    public interface IUserService
    {
        Task<IEnumerable<User>> GetAllUsersAsync();
        Task<User?> GetUserByIdAsync(int id);
        Task<IEnumerable<User>> GetUsersByRoleAsync(Role role);
        Task<bool> UpdateUserAsync(User user);
        Task<bool> DeleteUserAsync(int id);
        Task<bool> IsHeadNurseAsync(int userId);
        Task<bool> IsHeadNurseOrDelegateAsync(int userId);
    }
}
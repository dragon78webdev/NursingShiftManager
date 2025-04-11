using System.Threading.Tasks;
using NurseScheduler.Models;

namespace NurseScheduler.Services
{
    public interface IAuthService
    {
        Task<User?> AuthenticateAsync(string email, string password);
        Task<User?> AuthenticateGoogleAsync(string googleId, string email);
        Task<bool> RegisterAsync(User user, string password);
        Task<bool> ChangePasswordAsync(int userId, string oldPassword, string newPassword);
        string GenerateJwtToken(User user);
        Task<bool> CompleteProfileAsync(int userId, Role role, string firstName, string lastName);
    }
}
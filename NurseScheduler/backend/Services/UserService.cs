using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using NurseScheduler.Models;
using NurseScheduler.Repositories;

namespace NurseScheduler.Services
{
    public class UserService : IUserService
    {
        private readonly IUserRepository _userRepository;
        private readonly IDelegationRepository _delegationRepository;

        public UserService(
            IUserRepository userRepository,
            IDelegationRepository delegationRepository)
        {
            _userRepository = userRepository;
            _delegationRepository = delegationRepository;
        }

        public async Task<IEnumerable<User>> GetAllUsersAsync()
        {
            return await _userRepository.GetAllAsync();
        }

        public async Task<User?> GetUserByIdAsync(int id)
        {
            return await _userRepository.GetByIdAsync(id);
        }

        public async Task<IEnumerable<User>> GetUsersByRoleAsync(Role role)
        {
            return await _userRepository.GetByRoleAsync(role);
        }

        public async Task<bool> UpdateUserAsync(User user)
        {
            return await _userRepository.UpdateAsync(user);
        }

        public async Task<bool> DeleteUserAsync(int id)
        {
            return await _userRepository.DeleteAsync(id);
        }

        public async Task<bool> IsHeadNurseAsync(int userId)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            return user != null && user.Role == Role.HeadNurse;
        }

        public async Task<bool> IsHeadNurseOrDelegateAsync(int userId)
        {
            // Check if user is a head nurse
            var isHeadNurse = await IsHeadNurseAsync(userId);
            if (isHeadNurse)
                return true;
            
            // If not, check if they are an active delegate
            return await _delegationRepository.IsActiveDelegateAsync(userId);
        }
    }
}
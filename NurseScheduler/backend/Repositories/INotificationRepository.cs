using System.Collections.Generic;
using System.Threading.Tasks;
using NurseScheduler.Models;

namespace NurseScheduler.Repositories
{
    public interface INotificationRepository : IGenericRepository<Notification>
    {
        Task<IEnumerable<Notification>> GetByUserIdAsync(int userId);
        Task<IEnumerable<Notification>> GetUnreadByUserIdAsync(int userId);
    }
}
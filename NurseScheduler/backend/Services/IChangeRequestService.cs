using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using NurseScheduler.Models;

namespace NurseScheduler.Services
{
    public interface IChangeRequestService
    {
        Task<IEnumerable<ChangeRequest>> GetAllChangeRequestsAsync();
        Task<IEnumerable<ChangeRequest>> GetChangeRequestsByStaffIdAsync(int staffId);
        Task<IEnumerable<ChangeRequest>> GetChangeRequestsByStatusAsync(RequestStatus status);
        Task<ChangeRequest?> GetChangeRequestByIdAsync(int id);
        Task<bool> CreateChangeRequestAsync(ChangeRequest changeRequest);
        Task<bool> UpdateChangeRequestAsync(ChangeRequest changeRequest);
        Task<bool> ApproveChangeRequestAsync(int id, int approvedById);
        Task<bool> RejectChangeRequestAsync(int id, int rejectedById, string? reason = null);
    }
}
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using NurseScheduler.Models;

namespace NurseScheduler.Repositories
{
    public interface IDelegationRepository : IGenericRepository<Delegation>
    {
        Task<IEnumerable<Delegation>> GetByHeadNurseIdAsync(int headNurseId);
        Task<IEnumerable<Delegation>> GetByDelegateIdAsync(int delegateId);
        Task<IEnumerable<Delegation>> GetActiveAsync();
        Task<IEnumerable<Delegation>> GetActiveByHeadNurseIdAsync(int headNurseId);
        Task<bool> IsActiveDelegateAsync(int userId);
    }
}
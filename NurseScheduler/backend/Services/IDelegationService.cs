using System.Collections.Generic;
using System.Threading.Tasks;
using NurseScheduler.Models;

namespace NurseScheduler.Services
{
    public interface IDelegationService
    {
        Task<IEnumerable<Delegation>> GetAllDelegationsAsync();
        Task<IEnumerable<Delegation>> GetDelegationsByHeadNurseIdAsync(int headNurseId);
        Task<IEnumerable<Delegation>> GetActiveDelegationsAsync();
        Task<Delegation?> GetDelegationByIdAsync(int id);
        Task<bool> CreateDelegationAsync(Delegation delegation);
        Task<bool> UpdateDelegationAsync(Delegation delegation);
        Task<bool> DeleteDelegationAsync(int id);
    }
}
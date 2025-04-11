using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using NurseScheduler.Models;
using NurseScheduler.Repositories;

namespace NurseScheduler.Services
{
    public class DelegationService : IDelegationService
    {
        private readonly IDelegationRepository _delegationRepository;
        private readonly IUserRepository _userRepository;
        private readonly INotificationService _notificationService;
        private readonly ILogger<DelegationService> _logger;

        public DelegationService(
            IDelegationRepository delegationRepository,
            IUserRepository userRepository,
            INotificationService notificationService,
            ILogger<DelegationService> logger)
        {
            _delegationRepository = delegationRepository;
            _userRepository = userRepository;
            _notificationService = notificationService;
            _logger = logger;
        }

        public async Task<IEnumerable<Delegation>> GetAllDelegationsAsync()
        {
            return await _delegationRepository.GetAllAsync();
        }

        public async Task<IEnumerable<Delegation>> GetDelegationsByHeadNurseIdAsync(int headNurseId)
        {
            return await _delegationRepository.GetByHeadNurseIdAsync(headNurseId);
        }

        public async Task<IEnumerable<Delegation>> GetActiveDelegationsAsync()
        {
            return await _delegationRepository.GetActiveAsync();
        }

        public async Task<Delegation?> GetDelegationByIdAsync(int id)
        {
            return await _delegationRepository.GetByIdAsync(id);
        }

        public async Task<bool> CreateDelegationAsync(Delegation delegation)
        {
            try
            {
                delegation.CreatedAt = DateTime.UtcNow;
                var id = await _delegationRepository.CreateAsync(delegation);
                
                if (id > 0)
                {
                    // Get head nurse and delegate users
                    var headNurse = await _userRepository.GetByIdAsync(delegation.HeadNurseId);
                    var delegateUser = await _userRepository.GetByIdAsync(delegation.DelegateId);
                    
                    if (headNurse != null && delegateUser != null)
                    {
                        // Create notification for the head nurse
                        var headNurseNotification = new Notification
                        {
                            UserId = headNurse.Id,
                            Title = "Delegation Created",
                            Message = $"You have successfully delegated your responsibilities to {delegateUser.FirstName} {delegateUser.LastName} from {delegation.StartDate:yyyy-MM-dd} to {delegation.EndDate:yyyy-MM-dd}.",
                            CreatedAt = DateTime.UtcNow
                        };
                        
                        await _notificationService.CreateNotificationAsync(headNurseNotification);
                        
                        // Create notification for the delegate
                        var delegateNotification = new Notification
                        {
                            UserId = delegateUser.Id,
                            Title = "Delegation Received",
                            Message = $"{headNurse.FirstName} {headNurse.LastName} has delegated head nurse responsibilities to you from {delegation.StartDate:yyyy-MM-dd} to {delegation.EndDate:yyyy-MM-dd}.",
                            CreatedAt = DateTime.UtcNow
                        };
                        
                        await _notificationService.CreateNotificationAsync(delegateNotification);
                    }
                    
                    return true;
                }
                
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating delegation");
                return false;
            }
        }

        public async Task<bool> UpdateDelegationAsync(Delegation delegation)
        {
            try
            {
                var existingDelegation = await _delegationRepository.GetByIdAsync(delegation.Id);
                if (existingDelegation == null)
                    return false;
                
                var success = await _delegationRepository.UpdateAsync(delegation);
                
                if (success)
                {
                    // Get head nurse and delegate users
                    var headNurse = await _userRepository.GetByIdAsync(delegation.HeadNurseId);
                    var delegateUser = await _userRepository.GetByIdAsync(delegation.DelegateId);
                    
                    if (headNurse != null && delegateUser != null)
                    {
                        // Create notification for the head nurse
                        var headNurseNotification = new Notification
                        {
                            UserId = headNurse.Id,
                            Title = "Delegation Updated",
                            Message = $"Your delegation to {delegateUser.FirstName} {delegateUser.LastName} has been updated. New dates: {delegation.StartDate:yyyy-MM-dd} to {delegation.EndDate:yyyy-MM-dd}.",
                            CreatedAt = DateTime.UtcNow
                        };
                        
                        await _notificationService.CreateNotificationAsync(headNurseNotification);
                        
                        // Create notification for the delegate
                        var delegateNotification = new Notification
                        {
                            UserId = delegateUser.Id,
                            Title = "Delegation Updated",
                            Message = $"The delegation from {headNurse.FirstName} {headNurse.LastName} has been updated. New dates: {delegation.StartDate:yyyy-MM-dd} to {delegation.EndDate:yyyy-MM-dd}.",
                            CreatedAt = DateTime.UtcNow
                        };
                        
                        await _notificationService.CreateNotificationAsync(delegateNotification);
                    }
                }
                
                return success;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating delegation");
                return false;
            }
        }

        public async Task<bool> DeleteDelegationAsync(int id)
        {
            try
            {
                var delegation = await _delegationRepository.GetByIdAsync(id);
                if (delegation == null)
                    return false;
                
                // Get head nurse and delegate users before deleting
                var headNurse = await _userRepository.GetByIdAsync(delegation.HeadNurseId);
                var delegateUser = await _userRepository.GetByIdAsync(delegation.DelegateId);
                
                var success = await _delegationRepository.DeleteAsync(id);
                
                if (success && headNurse != null && delegateUser != null)
                {
                    // Create notification for the head nurse
                    var headNurseNotification = new Notification
                    {
                        UserId = headNurse.Id,
                        Title = "Delegation Canceled",
                        Message = $"Your delegation to {delegateUser.FirstName} {delegateUser.LastName} from {delegation.StartDate:yyyy-MM-dd} to {delegation.EndDate:yyyy-MM-dd} has been canceled.",
                        CreatedAt = DateTime.UtcNow
                    };
                    
                    await _notificationService.CreateNotificationAsync(headNurseNotification);
                    
                    // Create notification for the delegate
                    var delegateNotification = new Notification
                    {
                        UserId = delegateUser.Id,
                        Title = "Delegation Canceled",
                        Message = $"The delegation from {headNurse.FirstName} {headNurse.LastName} from {delegation.StartDate:yyyy-MM-dd} to {delegation.EndDate:yyyy-MM-dd} has been canceled.",
                        CreatedAt = DateTime.UtcNow
                    };
                    
                    await _notificationService.CreateNotificationAsync(delegateNotification);
                }
                
                return success;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting delegation");
                return false;
            }
        }
    }
}
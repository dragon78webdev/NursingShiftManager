using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using NurseScheduler.Models;
using NurseScheduler.Repositories;

namespace NurseScheduler.Services
{
    public class VacationService : IVacationService
    {
        private readonly IVacationRepository _vacationRepository;
        private readonly IStaffRepository _staffRepository;
        private readonly IUserRepository _userRepository;
        private readonly INotificationService _notificationService;
        private readonly ILogger<VacationService> _logger;

        public VacationService(
            IVacationRepository vacationRepository,
            IStaffRepository staffRepository,
            IUserRepository userRepository,
            INotificationService notificationService,
            ILogger<VacationService> logger)
        {
            _vacationRepository = vacationRepository;
            _staffRepository = staffRepository;
            _userRepository = userRepository;
            _notificationService = notificationService;
            _logger = logger;
        }

        public async Task<IEnumerable<Vacation>> GetVacationsByStaffIdAsync(int staffId)
        {
            return await _vacationRepository.GetByStaffIdAsync(staffId);
        }

        public async Task<IEnumerable<Vacation>> GetVacationsByDateRangeAsync(DateTime startDate, DateTime endDate)
        {
            return await _vacationRepository.GetByDateRangeAsync(startDate, endDate);
        }

        public async Task<Vacation?> GetVacationByIdAsync(int id)
        {
            return await _vacationRepository.GetByIdAsync(id);
        }

        public async Task<bool> CreateVacationAsync(Vacation vacation)
        {
            try
            {
                vacation.CreatedAt = DateTime.UtcNow;
                var id = await _vacationRepository.CreateAsync(vacation);
                
                if (id > 0)
                {
                    // Get staff member
                    var staff = await _staffRepository.GetByIdAsync(vacation.StaffId);
                    if (staff != null)
                    {
                        // Get user
                        var user = await _userRepository.GetByIdAsync(staff.UserId);
                        if (user != null)
                        {
                            // Create notification
                            var notification = new Notification
                            {
                                UserId = user.Id,
                                Title = "Vacation Request Created",
                                Message = $"Your vacation request from {vacation.StartDate:yyyy-MM-dd} to {vacation.EndDate:yyyy-MM-dd} has been submitted.",
                                CreatedAt = DateTime.UtcNow
                            };
                            
                            await _notificationService.CreateNotificationAsync(notification);
                            
                            // Notify head nurses about the request
                            var headNurses = await _userRepository.GetByRoleAsync(Role.HeadNurse);
                            foreach (var headNurse in headNurses)
                            {
                                var headNurseNotification = new Notification
                                {
                                    UserId = headNurse.Id,
                                    Title = "New Vacation Request",
                                    Message = $"{user.FirstName} {user.LastName} has requested vacation from {vacation.StartDate:yyyy-MM-dd} to {vacation.EndDate:yyyy-MM-dd}.",
                                    CreatedAt = DateTime.UtcNow
                                };
                                
                                await _notificationService.CreateNotificationAsync(headNurseNotification);
                            }
                        }
                    }
                    
                    return true;
                }
                
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating vacation request");
                return false;
            }
        }

        public async Task<bool> UpdateVacationAsync(Vacation vacation)
        {
            return await _vacationRepository.UpdateAsync(vacation);
        }

        public async Task<bool> DeleteVacationAsync(int id)
        {
            return await _vacationRepository.DeleteAsync(id);
        }

        public async Task<bool> ApproveVacationAsync(int id, int approvedById)
        {
            var vacation = await _vacationRepository.GetByIdAsync(id);
            if (vacation == null)
                return false;
            
            vacation.ApprovedById = approvedById;
            var success = await _vacationRepository.UpdateAsync(vacation);
            
            if (success)
            {
                // Get staff member
                var staff = await _staffRepository.GetByIdAsync(vacation.StaffId);
                if (staff != null)
                {
                    // Get user
                    var user = await _userRepository.GetByIdAsync(staff.UserId);
                    if (user != null)
                    {
                        // Get approver
                        var approver = await _userRepository.GetByIdAsync(approvedById);
                        
                        // Create notification
                        var notification = new Notification
                        {
                            UserId = user.Id,
                            Title = "Vacation Request Approved",
                            Message = $"Your vacation request from {vacation.StartDate:yyyy-MM-dd} to {vacation.EndDate:yyyy-MM-dd} has been approved by {approver?.FirstName} {approver?.LastName}.",
                            CreatedAt = DateTime.UtcNow
                        };
                        
                        await _notificationService.CreateNotificationAsync(notification);
                    }
                }
            }
            
            return success;
        }
    }
}
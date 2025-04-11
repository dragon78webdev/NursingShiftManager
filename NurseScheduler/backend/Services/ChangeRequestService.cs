using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using NurseScheduler.Models;
using NurseScheduler.Repositories;

namespace NurseScheduler.Services
{
    public class ChangeRequestService : IChangeRequestService
    {
        private readonly IChangeRequestRepository _changeRequestRepository;
        private readonly IShiftRepository _shiftRepository;
        private readonly IStaffRepository _staffRepository;
        private readonly IUserRepository _userRepository;
        private readonly INotificationService _notificationService;
        private readonly ILogger<ChangeRequestService> _logger;

        public ChangeRequestService(
            IChangeRequestRepository changeRequestRepository,
            IShiftRepository shiftRepository,
            IStaffRepository staffRepository,
            IUserRepository userRepository,
            INotificationService notificationService,
            ILogger<ChangeRequestService> logger)
        {
            _changeRequestRepository = changeRequestRepository;
            _shiftRepository = shiftRepository;
            _staffRepository = staffRepository;
            _userRepository = userRepository;
            _notificationService = notificationService;
            _logger = logger;
        }

        public async Task<IEnumerable<ChangeRequest>> GetAllChangeRequestsAsync()
        {
            return await _changeRequestRepository.GetAllAsync();
        }

        public async Task<IEnumerable<ChangeRequest>> GetChangeRequestsByStaffIdAsync(int staffId)
        {
            return await _changeRequestRepository.GetByStaffIdAsync(staffId);
        }

        public async Task<IEnumerable<ChangeRequest>> GetChangeRequestsByStatusAsync(RequestStatus status)
        {
            return await _changeRequestRepository.GetByStatusAsync(status);
        }

        public async Task<ChangeRequest?> GetChangeRequestByIdAsync(int id)
        {
            return await _changeRequestRepository.GetByIdAsync(id);
        }

        public async Task<bool> CreateChangeRequestAsync(ChangeRequest changeRequest)
        {
            try
            {
                var now = DateTime.UtcNow;
                changeRequest.CreatedAt = now;
                changeRequest.UpdatedAt = now;
                changeRequest.Status = RequestStatus.Pending;
                
                var id = await _changeRequestRepository.CreateAsync(changeRequest);
                
                if (id > 0)
                {
                    // Get staff member
                    var staff = await _staffRepository.GetByIdAsync(changeRequest.StaffId);
                    if (staff != null)
                    {
                        // Get user
                        var requester = await _userRepository.GetByIdAsync(staff.UserId);
                        
                        if (requester != null)
                        {
                            // Create notification for requester
                            var notification = new Notification
                            {
                                UserId = requester.Id,
                                Title = "Shift Change Request Created",
                                Message = $"Your shift change request for {changeRequest.Date:yyyy-MM-dd} has been submitted and is awaiting approval.",
                                CreatedAt = DateTime.UtcNow
                            };
                            
                            await _notificationService.CreateNotificationAsync(notification);
                            
                            // If it's a swap request, notify the target staff member
                            if (changeRequest.TargetStaffId.HasValue)
                            {
                                var targetStaff = await _staffRepository.GetByIdAsync(changeRequest.TargetStaffId.Value);
                                if (targetStaff != null)
                                {
                                    var targetUser = await _userRepository.GetByIdAsync(targetStaff.UserId);
                                    if (targetUser != null)
                                    {
                                        // Send notification to the target staff
                                        var targetNotification = new Notification
                                        {
                                            UserId = targetUser.Id,
                                            Title = "Shift Swap Request",
                                            Message = $"{requester.FirstName} {requester.LastName} has requested to swap shifts with you on {changeRequest.Date:yyyy-MM-dd}.",
                                            CreatedAt = DateTime.UtcNow
                                        };
                                        
                                        await _notificationService.CreateNotificationAsync(targetNotification);
                                        
                                        // Send email to the target staff
                                        await _notificationService.SendShiftChangeRequestEmailAsync(
                                            targetUser, 
                                            requester, 
                                            changeRequest.Date, 
                                            changeRequest.CurrentShiftType, 
                                            changeRequest.RequestedShiftType);
                                    }
                                }
                            }
                            
                            // Notify head nurses about the request
                            var headNurses = await _userRepository.GetByRoleAsync(Role.HeadNurse);
                            foreach (var headNurse in headNurses)
                            {
                                var headNurseNotification = new Notification
                                {
                                    UserId = headNurse.Id,
                                    Title = "New Shift Change Request",
                                    Message = $"{requester.FirstName} {requester.LastName} has requested a shift change for {changeRequest.Date:yyyy-MM-dd}.",
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
                _logger.LogError(ex, "Error creating change request");
                return false;
            }
        }

        public async Task<bool> UpdateChangeRequestAsync(ChangeRequest changeRequest)
        {
            changeRequest.UpdatedAt = DateTime.UtcNow;
            return await _changeRequestRepository.UpdateAsync(changeRequest);
        }

        public async Task<bool> ApproveChangeRequestAsync(int id, int approvedById)
        {
            var changeRequest = await _changeRequestRepository.GetByIdAsync(id);
            if (changeRequest == null)
                return false;
            
            // Update change request status
            changeRequest.Status = RequestStatus.Approved;
            changeRequest.ApprovedById = approvedById;
            changeRequest.UpdatedAt = DateTime.UtcNow;
            
            var success = await _changeRequestRepository.UpdateAsync(changeRequest);
            
            if (success)
            {
                try
                {
                    // Get staff member
                    var staff = await _staffRepository.GetByIdAsync(changeRequest.StaffId);
                    if (staff != null)
                    {
                        // Get the shift that needs to be changed
                        var shifts = await _shiftRepository.GetByStaffAndDateRangeAsync(
                            changeRequest.StaffId, 
                            changeRequest.Date.Date, 
                            changeRequest.Date.Date);
                        
                        var shift = shifts.FirstOrDefault();
                        
                        // If no shift exists, create one
                        if (shift == null)
                        {
                            shift = new Shift
                            {
                                StaffId = changeRequest.StaffId,
                                Date = changeRequest.Date.Date,
                                ShiftType = changeRequest.RequestedShiftType,
                                CreatedById = approvedById,
                                CreatedAt = DateTime.UtcNow,
                                UpdatedAt = DateTime.UtcNow
                            };
                            
                            await _shiftRepository.CreateAsync(shift);
                        }
                        else
                        {
                            // Update existing shift
                            shift.ShiftType = changeRequest.RequestedShiftType;
                            shift.UpdatedAt = DateTime.UtcNow;
                            
                            await _shiftRepository.UpdateAsync(shift);
                        }
                        
                        // If it's a swap request, update the target staff's shift too
                        if (changeRequest.TargetStaffId.HasValue)
                        {
                            var targetShifts = await _shiftRepository.GetByStaffAndDateRangeAsync(
                                changeRequest.TargetStaffId.Value, 
                                changeRequest.Date.Date, 
                                changeRequest.Date.Date);
                            
                            var targetShift = targetShifts.FirstOrDefault();
                            
                            // If no shift exists for target, create one
                            if (targetShift == null)
                            {
                                targetShift = new Shift
                                {
                                    StaffId = changeRequest.TargetStaffId.Value,
                                    Date = changeRequest.Date.Date,
                                    ShiftType = changeRequest.CurrentShiftType,
                                    CreatedById = approvedById,
                                    CreatedAt = DateTime.UtcNow,
                                    UpdatedAt = DateTime.UtcNow
                                };
                                
                                await _shiftRepository.CreateAsync(targetShift);
                            }
                            else
                            {
                                // Update existing target shift
                                targetShift.ShiftType = changeRequest.CurrentShiftType;
                                targetShift.UpdatedAt = DateTime.UtcNow;
                                
                                await _shiftRepository.UpdateAsync(targetShift);
                            }
                            
                            // Notify target staff
                            var targetStaff = await _staffRepository.GetByIdAsync(changeRequest.TargetStaffId.Value);
                            if (targetStaff != null)
                            {
                                var targetUser = await _userRepository.GetByIdAsync(targetStaff.UserId);
                                if (targetUser != null)
                                {
                                    var targetNotification = new Notification
                                    {
                                        UserId = targetUser.Id,
                                        Title = "Shift Swap Approved",
                                        Message = $"The shift swap request for {changeRequest.Date:yyyy-MM-dd} has been approved. Your shift has been updated to {GetShiftName(changeRequest.CurrentShiftType)}.",
                                        CreatedAt = DateTime.UtcNow
                                    };
                                    
                                    await _notificationService.CreateNotificationAsync(targetNotification);
                                }
                            }
                        }
                        
                        // Get requester user
                        var requester = await _userRepository.GetByIdAsync(staff.UserId);
                        if (requester != null)
                        {
                            // Create notification
                            var notification = new Notification
                            {
                                UserId = requester.Id,
                                Title = "Shift Change Request Approved",
                                Message = $"Your shift change request for {changeRequest.Date:yyyy-MM-dd} has been approved. Your schedule has been updated.",
                                CreatedAt = DateTime.UtcNow
                            };
                            
                            await _notificationService.CreateNotificationAsync(notification);
                            
                            // Send email notification
                            await _notificationService.SendChangeRequestStatusEmailAsync(
                                requester, 
                                RequestStatus.Approved, 
                                changeRequest.Date, 
                                changeRequest.RequestedShiftType);
                        }
                    }
                    
                    return true;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing approved change request");
                    return false;
                }
            }
            
            return false;
        }

        public async Task<bool> RejectChangeRequestAsync(int id, int rejectedById, string? reason = null)
        {
            var changeRequest = await _changeRequestRepository.GetByIdAsync(id);
            if (changeRequest == null)
                return false;
            
            // Update change request status
            changeRequest.Status = RequestStatus.Rejected;
            changeRequest.ApprovedById = rejectedById; // We use the same field for rejection too
            changeRequest.UpdatedAt = DateTime.UtcNow;
            if (!string.IsNullOrEmpty(reason))
            {
                changeRequest.Reason = reason;
            }
            
            var success = await _changeRequestRepository.UpdateAsync(changeRequest);
            
            if (success)
            {
                try
                {
                    // Get staff member
                    var staff = await _staffRepository.GetByIdAsync(changeRequest.StaffId);
                    if (staff != null)
                    {
                        // Get requester user
                        var requester = await _userRepository.GetByIdAsync(staff.UserId);
                        if (requester != null)
                        {
                            // Create notification
                            var notification = new Notification
                            {
                                UserId = requester.Id,
                                Title = "Shift Change Request Rejected",
                                Message = string.IsNullOrEmpty(reason)
                                    ? $"Your shift change request for {changeRequest.Date:yyyy-MM-dd} has been rejected."
                                    : $"Your shift change request for {changeRequest.Date:yyyy-MM-dd} has been rejected: {reason}",
                                CreatedAt = DateTime.UtcNow
                            };
                            
                            await _notificationService.CreateNotificationAsync(notification);
                            
                            // Send email notification
                            await _notificationService.SendChangeRequestStatusEmailAsync(
                                requester, 
                                RequestStatus.Rejected, 
                                changeRequest.Date, 
                                changeRequest.CurrentShiftType);
                        }
                    }
                    
                    // If it's a swap request, notify the target staff member
                    if (changeRequest.TargetStaffId.HasValue)
                    {
                        var targetStaff = await _staffRepository.GetByIdAsync(changeRequest.TargetStaffId.Value);
                        if (targetStaff != null)
                        {
                            var targetUser = await _userRepository.GetByIdAsync(targetStaff.UserId);
                            if (targetUser != null)
                            {
                                // Send notification to the target staff
                                var targetNotification = new Notification
                                {
                                    UserId = targetUser.Id,
                                    Title = "Shift Swap Request Rejected",
                                    Message = $"The shift swap request for {changeRequest.Date:yyyy-MM-dd} has been rejected.",
                                    CreatedAt = DateTime.UtcNow
                                };
                                
                                await _notificationService.CreateNotificationAsync(targetNotification);
                            }
                        }
                    }
                    
                    return true;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing rejected change request");
                    return false;
                }
            }
            
            return false;
        }

        private string GetShiftName(ShiftType shiftType)
        {
            return shiftType switch
            {
                ShiftType.Morning => "Morning Shift (07:00-15:00)",
                ShiftType.Afternoon => "Afternoon Shift (15:00-23:00)",
                ShiftType.Night => "Night Shift (23:00-07:00)",
                ShiftType.Rest => "Rest Day",
                ShiftType.Holiday => "Holiday",
                _ => shiftType.ToString()
            };
        }
    }
}
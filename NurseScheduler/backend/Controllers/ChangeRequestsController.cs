using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using NurseScheduler.Models;
using NurseScheduler.Services;

namespace NurseScheduler.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class ChangeRequestsController : ControllerBase
    {
        private readonly IChangeRequestService _changeRequestService;
        private readonly IUserService _userService;
        private readonly IStaffRepository _staffRepository;
        private readonly IUserRepository _userRepository;
        private readonly IShiftRepository _shiftRepository;
        private readonly ILogger<ChangeRequestsController> _logger;

        public ChangeRequestsController(
            IChangeRequestService changeRequestService,
            IUserService userService,
            IStaffRepository staffRepository,
            IUserRepository userRepository,
            IShiftRepository shiftRepository,
            ILogger<ChangeRequestsController> logger)
        {
            _changeRequestService = changeRequestService;
            _userService = userService;
            _staffRepository = staffRepository;
            _userRepository = userRepository;
            _shiftRepository = shiftRepository;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllChangeRequests([FromQuery] RequestStatus? status = null)
        {
            try
            {
                var userId = int.Parse(User.Identity?.Name ?? "0");
                var isHeadNurseOrDelegate = await _userService.IsHeadNurseOrDelegateAsync(userId);
                
                if (!isHeadNurseOrDelegate)
                    return Forbid();
                
                IEnumerable<ChangeRequest> requests;
                if (status.HasValue)
                {
                    requests = await _changeRequestService.GetChangeRequestsByStatusAsync(status.Value);
                }
                else
                {
                    requests = await _changeRequestService.GetAllChangeRequestsAsync();
                }
                
                var requestDtos = await Task.WhenAll(requests.Select(async request => 
                {
                    var staff = await _staffRepository.GetByIdAsync(request.StaffId);
                    var user = staff != null ? await _userRepository.GetByIdAsync(staff.UserId) : null;
                    
                    Staff? targetStaff = null;
                    User? targetUser = null;
                    if (request.TargetStaffId.HasValue)
                    {
                        targetStaff = await _staffRepository.GetByIdAsync(request.TargetStaffId.Value);
                        if (targetStaff != null)
                        {
                            targetUser = await _userRepository.GetByIdAsync(targetStaff.UserId);
                        }
                    }
                    
                    User? approver = null;
                    if (request.ApprovedById.HasValue)
                    {
                        approver = await _userRepository.GetByIdAsync(request.ApprovedById.Value);
                    }
                    
                    return new ChangeRequestDto
                    {
                        Id = request.Id,
                        StaffId = request.StaffId,
                        StaffName = user != null ? $"{user.FirstName} {user.LastName}" : "Unknown",
                        Date = request.Date,
                        CurrentShiftType = request.CurrentShiftType,
                        RequestedShiftType = request.RequestedShiftType,
                        Reason = request.Reason,
                        Status = request.Status,
                        Type = request.Type,
                        TargetStaffId = request.TargetStaffId,
                        TargetStaffName = targetUser != null ? $"{targetUser.FirstName} {targetUser.LastName}" : null,
                        ApprovedById = request.ApprovedById,
                        ApprovedByName = approver != null ? $"{approver.FirstName} {approver.LastName}" : null,
                        CreatedAt = request.CreatedAt,
                        Department = staff?.Department,
                    };
                }));
                
                return Ok(requestDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting change requests");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error retrieving change requests" });
            }
        }

        [HttpGet("staff/{staffId}")]
        public async Task<IActionResult> GetStaffChangeRequests(int staffId)
        {
            try
            {
                var currentUserId = int.Parse(User.Identity?.Name ?? "0");
                var isHeadNurseOrDelegate = await _userService.IsHeadNurseOrDelegateAsync(currentUserId);
                
                // Get the staff to check if current user is trying to access their own requests
                var staff = await _staffRepository.GetByIdAsync(staffId);
                var isSelf = staff != null && staff.UserId == currentUserId;
                
                // Only allow head nurses/delegates or the staff themselves to view their requests
                if (!isHeadNurseOrDelegate && !isSelf)
                    return Forbid();
                
                var requests = await _changeRequestService.GetChangeRequestsByStaffIdAsync(staffId);
                
                var requestDtos = await Task.WhenAll(requests.Select(async request => 
                {
                    var staffInfo = await _staffRepository.GetByIdAsync(request.StaffId);
                    var user = staffInfo != null ? await _userRepository.GetByIdAsync(staffInfo.UserId) : null;
                    
                    Staff? targetStaff = null;
                    User? targetUser = null;
                    if (request.TargetStaffId.HasValue)
                    {
                        targetStaff = await _staffRepository.GetByIdAsync(request.TargetStaffId.Value);
                        if (targetStaff != null)
                        {
                            targetUser = await _userRepository.GetByIdAsync(targetStaff.UserId);
                        }
                    }
                    
                    User? approver = null;
                    if (request.ApprovedById.HasValue)
                    {
                        approver = await _userRepository.GetByIdAsync(request.ApprovedById.Value);
                    }
                    
                    return new ChangeRequestDto
                    {
                        Id = request.Id,
                        StaffId = request.StaffId,
                        StaffName = user != null ? $"{user.FirstName} {user.LastName}" : "Unknown",
                        Date = request.Date,
                        CurrentShiftType = request.CurrentShiftType,
                        RequestedShiftType = request.RequestedShiftType,
                        Reason = request.Reason,
                        Status = request.Status,
                        Type = request.Type,
                        TargetStaffId = request.TargetStaffId,
                        TargetStaffName = targetUser != null ? $"{targetUser.FirstName} {targetUser.LastName}" : null,
                        ApprovedById = request.ApprovedById,
                        ApprovedByName = approver != null ? $"{approver.FirstName} {approver.LastName}" : null,
                        CreatedAt = request.CreatedAt,
                        Department = staffInfo?.Department,
                    };
                }));
                
                return Ok(requestDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting staff change requests");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error retrieving staff change requests" });
            }
        }

        [HttpGet("my-requests")]
        public async Task<IActionResult> GetMyChangeRequests()
        {
            try
            {
                var userId = int.Parse(User.Identity?.Name ?? "0");
                var staff = await _staffRepository.GetByUserIdAsync(userId);
                
                if (staff == null)
                    return NotFound(new { message = "Staff record not found" });
                
                var requests = await _changeRequestService.GetChangeRequestsByStaffIdAsync(staff.Id);
                
                var user = await _userRepository.GetByIdAsync(userId);
                
                var requestDtos = await Task.WhenAll(requests.Select(async request => 
                {
                    Staff? targetStaff = null;
                    User? targetUser = null;
                    if (request.TargetStaffId.HasValue)
                    {
                        targetStaff = await _staffRepository.GetByIdAsync(request.TargetStaffId.Value);
                        if (targetStaff != null)
                        {
                            targetUser = await _userRepository.GetByIdAsync(targetStaff.UserId);
                        }
                    }
                    
                    User? approver = null;
                    if (request.ApprovedById.HasValue)
                    {
                        approver = await _userRepository.GetByIdAsync(request.ApprovedById.Value);
                    }
                    
                    return new ChangeRequestDto
                    {
                        Id = request.Id,
                        StaffId = request.StaffId,
                        StaffName = user != null ? $"{user.FirstName} {user.LastName}" : "Unknown",
                        Date = request.Date,
                        CurrentShiftType = request.CurrentShiftType,
                        RequestedShiftType = request.RequestedShiftType,
                        Reason = request.Reason,
                        Status = request.Status,
                        Type = request.Type,
                        TargetStaffId = request.TargetStaffId,
                        TargetStaffName = targetUser != null ? $"{targetUser.FirstName} {targetUser.LastName}" : null,
                        ApprovedById = request.ApprovedById,
                        ApprovedByName = approver != null ? $"{approver.FirstName} {approver.LastName}" : null,
                        CreatedAt = request.CreatedAt,
                        Department = staff.Department,
                    };
                }));
                
                return Ok(requestDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting my change requests");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error retrieving your change requests" });
            }
        }

        [HttpPost]
        public async Task<IActionResult> CreateChangeRequest([FromBody] CreateChangeRequestRequest request)
        {
            try
            {
                var userId = int.Parse(User.Identity?.Name ?? "0");
                var staff = await _staffRepository.GetByUserIdAsync(userId);
                
                // Check if this is a staff member
                if (staff == null)
                    return BadRequest(new { message = "You must be a staff member to request shift changes" });
                
                // Get the current shift
                var shifts = await _shiftRepository.GetByStaffAndDateRangeAsync(
                    staff.Id, 
                    request.Date.Date, 
                    request.Date.Date);
                
                var currentShift = shifts.FirstOrDefault();
                
                // If no current shift, use Rest as the current shift type
                var currentShiftType = currentShift?.ShiftType ?? ShiftType.Rest;
                
                var changeRequest = new ChangeRequest
                {
                    StaffId = staff.Id,
                    Date = request.Date.Date,
                    CurrentShiftType = currentShiftType,
                    RequestedShiftType = request.RequestedShiftType,
                    Reason = request.Reason,
                    Type = request.Type,
                    TargetStaffId = request.TargetStaffId,
                    Status = RequestStatus.Pending,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                
                var success = await _changeRequestService.CreateChangeRequestAsync(changeRequest);
                
                if (!success)
                    return BadRequest(new { message = "Error creating change request" });
                
                return Ok(new { message = "Change request created successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating change request");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error creating change request" });
            }
        }

        [HttpPut("approve/{id}")]
        public async Task<IActionResult> ApproveChangeRequest(int id)
        {
            try
            {
                var userId = int.Parse(User.Identity?.Name ?? "0");
                var isHeadNurseOrDelegate = await _userService.IsHeadNurseOrDelegateAsync(userId);
                
                if (!isHeadNurseOrDelegate)
                    return Forbid();
                
                var success = await _changeRequestService.ApproveChangeRequestAsync(id, userId);
                
                if (!success)
                    return NotFound(new { message = "Change request not found or could not be approved" });
                
                return Ok(new { message = "Change request approved successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error approving change request");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error approving change request" });
            }
        }

        [HttpPut("reject/{id}")]
        public async Task<IActionResult> RejectChangeRequest(int id, [FromBody] RejectChangeRequestRequest request)
        {
            try
            {
                var userId = int.Parse(User.Identity?.Name ?? "0");
                var isHeadNurseOrDelegate = await _userService.IsHeadNurseOrDelegateAsync(userId);
                
                if (!isHeadNurseOrDelegate)
                    return Forbid();
                
                var success = await _changeRequestService.RejectChangeRequestAsync(id, userId, request.Reason);
                
                if (!success)
                    return NotFound(new { message = "Change request not found or could not be rejected" });
                
                return Ok(new { message = "Change request rejected successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error rejecting change request");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error rejecting change request" });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteChangeRequest(int id)
        {
            try
            {
                var userId = int.Parse(User.Identity?.Name ?? "0");
                
                // Check if this is the staff member's own request
                ChangeRequest? request = await _changeRequestService.GetChangeRequestByIdAsync(id);
                if (request == null)
                    return NotFound(new { message = "Change request not found" });
                
                var staff = await _staffRepository.GetByIdAsync(request.StaffId);
                var isSelf = staff != null && staff.UserId == userId;
                
                var isHeadNurseOrDelegate = await _userService.IsHeadNurseOrDelegateAsync(userId);
                
                // Only allow the requester to delete pending requests
                if (!isSelf && !isHeadNurseOrDelegate)
                    return Forbid();
                
                // Don't allow deleting approved or rejected requests unless you're a head nurse
                if (request.Status != RequestStatus.Pending && !isHeadNurseOrDelegate)
                    return BadRequest(new { message = "Cannot delete a request that has been processed" });
                
                // Update the request to mark it as deleted
                request.Status = RequestStatus.Rejected;
                request.Reason = "Canceled by user";
                request.UpdatedAt = DateTime.UtcNow;
                
                var success = await _changeRequestService.UpdateChangeRequestAsync(request);
                
                if (!success)
                    return NotFound(new { message = "Change request not found or could not be canceled" });
                
                return Ok(new { message = "Change request canceled successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting change request");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error canceling change request" });
            }
        }
    }

    public class ChangeRequestDto
    {
        public int Id { get; set; }
        public int StaffId { get; set; }
        public string StaffName { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public ShiftType CurrentShiftType { get; set; }
        public ShiftType RequestedShiftType { get; set; }
        public string? Reason { get; set; }
        public RequestStatus Status { get; set; }
        public string Type { get; set; } = string.Empty;
        public int? TargetStaffId { get; set; }
        public string? TargetStaffName { get; set; }
        public int? ApprovedById { get; set; }
        public string? ApprovedByName { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? Department { get; set; }
    }

    public class CreateChangeRequestRequest
    {
        public DateTime Date { get; set; }
        public ShiftType RequestedShiftType { get; set; }
        public string? Reason { get; set; }
        public string Type { get; set; } = "swap"; // swap, time_off, compensation
        public int? TargetStaffId { get; set; } // For swap requests
    }

    public class RejectChangeRequestRequest
    {
        public string? Reason { get; set; }
    }
}
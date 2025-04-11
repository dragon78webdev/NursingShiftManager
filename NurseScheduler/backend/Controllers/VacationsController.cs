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
    public class VacationsController : ControllerBase
    {
        private readonly IVacationService _vacationService;
        private readonly IUserService _userService;
        private readonly IStaffRepository _staffRepository;
        private readonly IUserRepository _userRepository;
        private readonly ILogger<VacationsController> _logger;

        public VacationsController(
            IVacationService vacationService,
            IUserService userService,
            IStaffRepository staffRepository,
            IUserRepository userRepository,
            ILogger<VacationsController> logger)
        {
            _vacationService = vacationService;
            _userService = userService;
            _staffRepository = staffRepository;
            _userRepository = userRepository;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetVacations([FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
        {
            try
            {
                var userId = int.Parse(User.Identity?.Name ?? "0");
                var isHeadNurseOrDelegate = await _userService.IsHeadNurseOrDelegateAsync(userId);
                
                if (!isHeadNurseOrDelegate)
                    return Forbid();
                
                // If date range is specified, get vacations in that range
                IEnumerable<Vacation> vacations;
                if (startDate.HasValue && endDate.HasValue)
                {
                    vacations = await _vacationService.GetVacationsByDateRangeAsync(startDate.Value, endDate.Value);
                }
                else
                {
                    // Default to the current month if no dates are provided
                    var today = DateTime.Today;
                    var firstDayOfMonth = new DateTime(today.Year, today.Month, 1);
                    var lastDayOfMonth = firstDayOfMonth.AddMonths(1).AddDays(-1);
                    
                    vacations = await _vacationService.GetVacationsByDateRangeAsync(firstDayOfMonth, lastDayOfMonth);
                }
                
                // Convert to DTOs with staff and user information
                var vacationDtos = await Task.WhenAll(vacations.Select(async vacation => 
                {
                    var staff = await _staffRepository.GetByIdAsync(vacation.StaffId);
                    var user = staff != null ? await _userRepository.GetByIdAsync(staff.UserId) : null;
                    
                    User? approver = null;
                    if (vacation.ApprovedById.HasValue)
                    {
                        approver = await _userRepository.GetByIdAsync(vacation.ApprovedById.Value);
                    }
                    
                    return new VacationDto
                    {
                        Id = vacation.Id,
                        StaffId = vacation.StaffId,
                        StaffName = user != null ? $"{user.FirstName} {user.LastName}" : "Unknown",
                        StartDate = vacation.StartDate,
                        EndDate = vacation.EndDate,
                        Reason = vacation.Reason,
                        IsApproved = vacation.ApprovedById.HasValue,
                        ApprovedBy = approver != null ? $"{approver.FirstName} {approver.LastName}" : null,
                        Department = staff?.Department,
                        Role = user?.Role ?? Role.Nurse
                    };
                }));
                
                return Ok(vacationDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting vacations");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error retrieving vacations" });
            }
        }

        [HttpGet("staff/{staffId}")]
        public async Task<IActionResult> GetStaffVacations(int staffId)
        {
            try
            {
                var currentUserId = int.Parse(User.Identity?.Name ?? "0");
                var isHeadNurseOrDelegate = await _userService.IsHeadNurseOrDelegateAsync(currentUserId);
                
                // Get the staff to check if current user is trying to access their own vacations
                var staff = await _staffRepository.GetByIdAsync(staffId);
                var isSelf = staff != null && staff.UserId == currentUserId;
                
                // Only allow head nurses/delegates or the staff themselves to view their vacations
                if (!isHeadNurseOrDelegate && !isSelf)
                    return Forbid();
                
                var vacations = await _vacationService.GetVacationsByStaffIdAsync(staffId);
                
                var vacationDtos = await Task.WhenAll(vacations.Select(async vacation => 
                {
                    var staffInfo = await _staffRepository.GetByIdAsync(vacation.StaffId);
                    var user = staffInfo != null ? await _userRepository.GetByIdAsync(staffInfo.UserId) : null;
                    
                    User? approver = null;
                    if (vacation.ApprovedById.HasValue)
                    {
                        approver = await _userRepository.GetByIdAsync(vacation.ApprovedById.Value);
                    }
                    
                    return new VacationDto
                    {
                        Id = vacation.Id,
                        StaffId = vacation.StaffId,
                        StaffName = user != null ? $"{user.FirstName} {user.LastName}" : "Unknown",
                        StartDate = vacation.StartDate,
                        EndDate = vacation.EndDate,
                        Reason = vacation.Reason,
                        IsApproved = vacation.ApprovedById.HasValue,
                        ApprovedBy = approver != null ? $"{approver.FirstName} {approver.LastName}" : null,
                        Department = staffInfo?.Department,
                        Role = user?.Role ?? Role.Nurse
                    };
                }));
                
                return Ok(vacationDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting staff vacations");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error retrieving staff vacations" });
            }
        }

        [HttpGet("my-vacations")]
        public async Task<IActionResult> GetMyVacations()
        {
            try
            {
                var userId = int.Parse(User.Identity?.Name ?? "0");
                var staff = await _staffRepository.GetByUserIdAsync(userId);
                
                if (staff == null)
                    return NotFound(new { message = "Staff record not found" });
                
                var vacations = await _vacationService.GetVacationsByStaffIdAsync(staff.Id);
                
                var user = await _userRepository.GetByIdAsync(userId);
                
                var vacationDtos = await Task.WhenAll(vacations.Select(async vacation => 
                {
                    User? approver = null;
                    if (vacation.ApprovedById.HasValue)
                    {
                        approver = await _userRepository.GetByIdAsync(vacation.ApprovedById.Value);
                    }
                    
                    return new VacationDto
                    {
                        Id = vacation.Id,
                        StaffId = vacation.StaffId,
                        StaffName = user != null ? $"{user.FirstName} {user.LastName}" : "Unknown",
                        StartDate = vacation.StartDate,
                        EndDate = vacation.EndDate,
                        Reason = vacation.Reason,
                        IsApproved = vacation.ApprovedById.HasValue,
                        ApprovedBy = approver != null ? $"{approver.FirstName} {approver.LastName}" : null,
                        Department = staff.Department,
                        Role = user?.Role ?? Role.Nurse
                    };
                }));
                
                return Ok(vacationDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting my vacations");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error retrieving your vacations" });
            }
        }

        [HttpPost]
        public async Task<IActionResult> CreateVacation([FromBody] CreateVacationRequest request)
        {
            try
            {
                var userId = int.Parse(User.Identity?.Name ?? "0");
                var staff = await _staffRepository.GetByUserIdAsync(userId);
                
                // Check if this is a staff member
                if (staff == null)
                    return BadRequest(new { message = "You must be a staff member to request vacations" });
                
                var vacation = new Vacation
                {
                    StaffId = staff.Id,
                    StartDate = request.StartDate,
                    EndDate = request.EndDate,
                    Reason = request.Reason,
                    CreatedAt = DateTime.UtcNow
                };
                
                var success = await _vacationService.CreateVacationAsync(vacation);
                
                if (!success)
                    return BadRequest(new { message = "Error creating vacation request" });
                
                return Ok(new { message = "Vacation request created successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating vacation");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error creating vacation request" });
            }
        }

        [HttpPut("approve/{id}")]
        public async Task<IActionResult> ApproveVacation(int id)
        {
            try
            {
                var userId = int.Parse(User.Identity?.Name ?? "0");
                var isHeadNurseOrDelegate = await _userService.IsHeadNurseOrDelegateAsync(userId);
                
                if (!isHeadNurseOrDelegate)
                    return Forbid();
                
                var success = await _vacationService.ApproveVacationAsync(id, userId);
                
                if (!success)
                    return NotFound(new { message = "Vacation request not found or could not be approved" });
                
                return Ok(new { message = "Vacation request approved successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error approving vacation");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error approving vacation request" });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteVacation(int id)
        {
            try
            {
                var userId = int.Parse(User.Identity?.Name ?? "0");
                var isHeadNurseOrDelegate = await _userService.IsHeadNurseOrDelegateAsync(userId);
                
                // Check if this is the staff member's own vacation
                var vacation = await _vacationService.GetVacationByIdAsync(id);
                if (vacation == null)
                    return NotFound(new { message = "Vacation request not found" });
                
                var staff = await _staffRepository.GetByIdAsync(vacation.StaffId);
                var isSelf = staff != null && staff.UserId == userId;
                
                // Only allow head nurses/delegates or the staff themselves to delete
                if (!isHeadNurseOrDelegate && !isSelf)
                    return Forbid();
                
                // Only allow deletion if the vacation has not been approved yet
                if (vacation.ApprovedById.HasValue && !isHeadNurseOrDelegate)
                    return BadRequest(new { message = "Cannot delete an approved vacation request" });
                
                var success = await _vacationService.DeleteVacationAsync(id);
                
                if (!success)
                    return NotFound(new { message = "Vacation request not found or could not be deleted" });
                
                return Ok(new { message = "Vacation request deleted successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting vacation");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error deleting vacation request" });
            }
        }
    }

    public class VacationDto
    {
        public int Id { get; set; }
        public int StaffId { get; set; }
        public string StaffName { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string? Reason { get; set; }
        public bool IsApproved { get; set; }
        public string? ApprovedBy { get; set; }
        public string? Department { get; set; }
        public Role Role { get; set; }
    }

    public class CreateVacationRequest
    {
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string? Reason { get; set; }
    }
}
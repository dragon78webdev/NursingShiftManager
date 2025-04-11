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
    public class ScheduleController : ControllerBase
    {
        private readonly IScheduleService _scheduleService;
        private readonly IUserService _userService;
        private readonly IStaffRepository _staffRepository;
        private readonly IUserRepository _userRepository;
        private readonly INotificationService _notificationService;
        private readonly ILogger<ScheduleController> _logger;

        public ScheduleController(
            IScheduleService scheduleService,
            IUserService userService,
            IStaffRepository staffRepository,
            IUserRepository userRepository,
            INotificationService notificationService,
            ILogger<ScheduleController> logger)
        {
            _scheduleService = scheduleService;
            _userService = userService;
            _staffRepository = staffRepository;
            _userRepository = userRepository;
            _notificationService = notificationService;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetSchedule(
            [FromQuery] DateTime startDate, 
            [FromQuery] DateTime endDate, 
            [FromQuery] Role? role = null,
            [FromQuery] string? department = null)
        {
            try
            {
                IEnumerable<Shift> shifts;
                
                if (role.HasValue && !string.IsNullOrEmpty(department))
                {
                    // Get shifts by role and department
                    shifts = await _scheduleService.GetScheduleByRoleAsync(role.Value, startDate, endDate);
                    shifts = shifts.Where(s => 
                    {
                        var staff = _staffRepository.GetByIdAsync(s.StaffId).Result;
                        return staff != null && staff.Department == department;
                    });
                }
                else if (role.HasValue)
                {
                    // Get shifts by role only
                    shifts = await _scheduleService.GetScheduleByRoleAsync(role.Value, startDate, endDate);
                }
                else if (!string.IsNullOrEmpty(department))
                {
                    // Get shifts by department only
                    shifts = await _scheduleService.GetScheduleByDepartmentAsync(department, startDate, endDate);
                }
                else
                {
                    // Get all shifts in the date range
                    shifts = await _scheduleService.GetScheduleByDateRangeAsync(startDate, endDate);
                }
                
                // Convert shifts to DTOs with staff and user information
                var shiftDtos = await Task.WhenAll(shifts.Select(async shift => 
                {
                    var staff = await _staffRepository.GetByIdAsync(shift.StaffId);
                    var user = staff != null ? await _userRepository.GetByIdAsync(staff.UserId) : null;
                    
                    return new ShiftDto
                    {
                        Id = shift.Id,
                        StaffId = shift.StaffId,
                        Date = shift.Date,
                        ShiftType = shift.ShiftType,
                        StaffName = user != null ? $"{user.FirstName} {user.LastName}" : "Unknown",
                        Department = staff?.Department,
                        Role = user?.Role ?? Role.Nurse
                    };
                }));
                
                return Ok(shiftDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting schedule");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error retrieving schedule" });
            }
        }

        [HttpGet("staff/{staffId}")]
        public async Task<IActionResult> GetStaffSchedule(
            int staffId, 
            [FromQuery] DateTime startDate, 
            [FromQuery] DateTime endDate)
        {
            try
            {
                var shifts = await _scheduleService.GetScheduleByStaffIdAsync(staffId, startDate, endDate);
                
                var staff = await _staffRepository.GetByIdAsync(staffId);
                var user = staff != null ? await _userRepository.GetByIdAsync(staff.UserId) : null;
                
                var shiftDtos = shifts.Select(shift => new ShiftDto
                {
                    Id = shift.Id,
                    StaffId = shift.StaffId,
                    Date = shift.Date,
                    ShiftType = shift.ShiftType,
                    StaffName = user != null ? $"{user.FirstName} {user.LastName}" : "Unknown",
                    Department = staff?.Department,
                    Role = user?.Role ?? Role.Nurse
                }).ToList();
                
                return Ok(shiftDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting staff schedule");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error retrieving staff schedule" });
            }
        }

        [HttpGet("my-schedule")]
        public async Task<IActionResult> GetMySchedule(
            [FromQuery] DateTime startDate, 
            [FromQuery] DateTime endDate)
        {
            try
            {
                var userId = int.Parse(User.Identity?.Name ?? "0");
                var staff = await _staffRepository.GetByUserIdAsync(userId);
                
                if (staff == null)
                    return NotFound(new { message = "Staff record not found" });
                
                var shifts = await _scheduleService.GetScheduleByStaffIdAsync(staff.Id, startDate, endDate);
                
                var user = await _userRepository.GetByIdAsync(userId);
                
                var shiftDtos = shifts.Select(shift => new ShiftDto
                {
                    Id = shift.Id,
                    StaffId = shift.StaffId,
                    Date = shift.Date,
                    ShiftType = shift.ShiftType,
                    StaffName = user != null ? $"{user.FirstName} {user.LastName}" : "Unknown",
                    Department = staff.Department,
                    Role = user?.Role ?? Role.Nurse
                }).ToList();
                
                return Ok(shiftDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting my schedule");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error retrieving your schedule" });
            }
        }

        [HttpPut("shift/{id}")]
        public async Task<IActionResult> UpdateShift(int id, [FromBody] UpdateShiftRequest request)
        {
            try
            {
                var userId = int.Parse(User.Identity?.Name ?? "0");
                var isHeadNurseOrDelegate = await _userService.IsHeadNurseOrDelegateAsync(userId);
                
                if (!isHeadNurseOrDelegate)
                    return Forbid();
                
                var success = await _scheduleService.UpdateShiftAsync(id, request.ShiftType);
                
                if (!success)
                    return NotFound(new { message = "Shift not found or could not be updated" });
                
                return Ok(new { message = "Shift updated successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating shift");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error updating shift" });
            }
        }

        [HttpPost("generate")]
        public async Task<IActionResult> GenerateSchedule([FromBody] GenerateScheduleRequest request)
        {
            try
            {
                var userId = int.Parse(User.Identity?.Name ?? "0");
                var isHeadNurseOrDelegate = await _userService.IsHeadNurseOrDelegateAsync(userId);
                
                if (!isHeadNurseOrDelegate)
                    return Forbid();
                
                var shiftsCreated = await _scheduleService.GenerateScheduleAsync(
                    request.StartDate,
                    request.EndDate,
                    request.StaffType,
                    request.Department,
                    userId);
                
                if (shiftsCreated <= 0)
                    return BadRequest(new { message = "No shifts were created. Check if there are active staff members in the department." });
                
                // Get staff of the given role and department to notify them
                var allStaff = await _staffRepository.GetByRoleAsync(request.StaffType);
                var departmentStaff = allStaff.Where(s => s.Department == request.Department && s.IsActive).ToList();
                
                foreach (var staff in departmentStaff)
                {
                    var user = await _userRepository.GetByIdAsync(staff.UserId);
                    if (user != null)
                    {
                        var notification = new Notification
                        {
                            UserId = user.Id,
                            Title = "New Schedule Generated",
                            Message = $"A new schedule has been generated for {request.StartDate:yyyy-MM-dd} to {request.EndDate:yyyy-MM-dd}. Please check your shifts.",
                            CreatedAt = DateTime.UtcNow
                        };
                        
                        await _notificationService.CreateNotificationAsync(notification);
                    }
                }
                
                return Ok(new 
                { 
                    message = "Schedule generated successfully", 
                    shiftsCreated 
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating schedule");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error generating schedule" });
            }
        }

        [HttpGet("pdf")]
        public async Task<IActionResult> GeneratePdf(
            [FromQuery] DateTime startDate, 
            [FromQuery] DateTime endDate, 
            [FromQuery] Role staffType)
        {
            try
            {
                var userId = int.Parse(User.Identity?.Name ?? "0");
                var isHeadNurseOrDelegate = await _userService.IsHeadNurseOrDelegateAsync(userId);
                
                if (!isHeadNurseOrDelegate)
                    return Forbid();
                
                var pdfBytes = await _scheduleService.GeneratePdfAsync(startDate, endDate, staffType);
                
                return File(pdfBytes, "application/pdf", $"schedule_{staffType}_{startDate:yyyyMMdd}_{endDate:yyyyMMdd}.pdf");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating PDF");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error generating PDF" });
            }
        }

        [HttpPost("email")]
        public async Task<IActionResult> EmailSchedule([FromBody] EmailScheduleRequest request)
        {
            try
            {
                var userId = int.Parse(User.Identity?.Name ?? "0");
                var isHeadNurseOrDelegate = await _userService.IsHeadNurseOrDelegateAsync(userId);
                
                if (!isHeadNurseOrDelegate)
                    return Forbid();
                
                // Generate PDF
                var pdfBytes = await _scheduleService.GeneratePdfAsync(
                    request.StartDate,
                    request.EndDate,
                    request.StaffType);
                
                // Get all users with the specified role to email them
                var users = await _userRepository.GetByRoleAsync(request.StaffType);
                
                foreach (var user in users)
                {
                    await _notificationService.SendScheduleEmailAsync(
                        user,
                        request.StartDate,
                        request.EndDate,
                        request.StaffType,
                        pdfBytes);
                }
                
                return Ok(new { message = "Schedule emails sent successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error emailing schedule");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error sending schedule emails" });
            }
        }
    }

    public class ShiftDto
    {
        public int Id { get; set; }
        public int StaffId { get; set; }
        public DateTime Date { get; set; }
        public ShiftType ShiftType { get; set; }
        public string StaffName { get; set; } = string.Empty;
        public string? Department { get; set; }
        public Role Role { get; set; }
    }

    public class UpdateShiftRequest
    {
        public ShiftType ShiftType { get; set; }
    }

    public class GenerateScheduleRequest
    {
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public Role StaffType { get; set; }
        public string Department { get; set; } = string.Empty;
    }

    public class EmailScheduleRequest
    {
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public Role StaffType { get; set; }
    }
}
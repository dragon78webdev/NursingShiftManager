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
    public class UsersController : ControllerBase
    {
        private readonly IUserService _userService;
        private readonly IStaffRepository _staffRepository;
        private readonly ILogger<UsersController> _logger;

        public UsersController(
            IUserService userService,
            IStaffRepository staffRepository,
            ILogger<UsersController> logger)
        {
            _userService = userService;
            _staffRepository = staffRepository;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllUsers()
        {
            try
            {
                var userId = int.Parse(User.Identity?.Name ?? "0");
                var isHeadNurseOrDelegate = await _userService.IsHeadNurseOrDelegateAsync(userId);
                
                if (!isHeadNurseOrDelegate)
                    return Forbid();
                
                var users = await _userService.GetAllUsersAsync();
                
                var userDtos = await Task.WhenAll(users.Select(async user => 
                {
                    var staffInfo = await _staffRepository.GetByUserIdAsync(user.Id);
                    
                    return new UserDto
                    {
                        Id = user.Id,
                        Email = user.Email,
                        FirstName = user.FirstName,
                        LastName = user.LastName,
                        Role = user.Role,
                        Department = staffInfo?.Department,
                        IsPartTime = staffInfo?.IsPartTime ?? false,
                        WeeklyHours = staffInfo?.WeeklyHours ?? 0,
                        Qualification = staffInfo?.Qualification,
                        JoinDate = staffInfo?.JoinDate ?? DateTime.MinValue,
                        IsActive = staffInfo?.IsActive ?? true
                    };
                }));
                
                return Ok(userDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting all users");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error retrieving users" });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetUserById(int id)
        {
            try
            {
                var user = await _userService.GetUserByIdAsync(id);
                
                if (user == null)
                    return NotFound(new { message = "User not found" });
                
                var staffInfo = await _staffRepository.GetByUserIdAsync(user.Id);
                
                var userDto = new UserDto
                {
                    Id = user.Id,
                    Email = user.Email,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    Role = user.Role,
                    Department = staffInfo?.Department,
                    IsPartTime = staffInfo?.IsPartTime ?? false,
                    WeeklyHours = staffInfo?.WeeklyHours ?? 0,
                    Qualification = staffInfo?.Qualification,
                    JoinDate = staffInfo?.JoinDate ?? DateTime.MinValue,
                    IsActive = staffInfo?.IsActive ?? true
                };
                
                return Ok(userDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting user by ID");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error retrieving user" });
            }
        }

        [HttpGet("role/{role}")]
        public async Task<IActionResult> GetUsersByRole(Role role)
        {
            try
            {
                var users = await _userService.GetUsersByRoleAsync(role);
                
                var userDtos = await Task.WhenAll(users.Select(async user => 
                {
                    var staffInfo = await _staffRepository.GetByUserIdAsync(user.Id);
                    
                    return new UserDto
                    {
                        Id = user.Id,
                        Email = user.Email,
                        FirstName = user.FirstName,
                        LastName = user.LastName,
                        Role = user.Role,
                        Department = staffInfo?.Department,
                        IsPartTime = staffInfo?.IsPartTime ?? false,
                        WeeklyHours = staffInfo?.WeeklyHours ?? 0,
                        Qualification = staffInfo?.Qualification,
                        JoinDate = staffInfo?.JoinDate ?? DateTime.MinValue,
                        IsActive = staffInfo?.IsActive ?? true
                    };
                }));
                
                return Ok(userDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting users by role");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error retrieving users" });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserRequest request)
        {
            try
            {
                var currentUserId = int.Parse(User.Identity?.Name ?? "0");
                var isHeadNurseOrDelegate = await _userService.IsHeadNurseOrDelegateAsync(currentUserId);
                
                // Only allow head nurses/delegates or the user themselves to update
                if (!isHeadNurseOrDelegate && id != currentUserId)
                    return Forbid();
                
                var user = await _userService.GetUserByIdAsync(id);
                
                if (user == null)
                    return NotFound(new { message = "User not found" });
                
                user.FirstName = request.FirstName;
                user.LastName = request.LastName;
                
                // Only head nurses can change roles
                if (isHeadNurseOrDelegate && request.Role.HasValue)
                {
                    user.Role = request.Role.Value;
                }
                
                var success = await _userService.UpdateUserAsync(user);
                
                if (!success)
                    return BadRequest(new { message = "Error updating user" });
                
                // Update staff information if it exists
                var staffInfo = await _staffRepository.GetByUserIdAsync(id);
                
                if (staffInfo != null && isHeadNurseOrDelegate)
                {
                    staffInfo.Department = request.Department;
                    staffInfo.IsPartTime = request.IsPartTime;
                    staffInfo.WeeklyHours = request.WeeklyHours;
                    staffInfo.Qualification = request.Qualification;
                    staffInfo.IsActive = request.IsActive;
                    
                    await _staffRepository.UpdateAsync(staffInfo);
                }
                
                return Ok(new { message = "User updated successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating user");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error updating user" });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            try
            {
                var currentUserId = int.Parse(User.Identity?.Name ?? "0");
                var isHeadNurse = await _userService.IsHeadNurseAsync(currentUserId);
                
                // Only allow head nurses to delete users
                if (!isHeadNurse)
                    return Forbid();
                
                var success = await _userService.DeleteUserAsync(id);
                
                if (!success)
                    return NotFound(new { message = "User not found or could not be deleted" });
                
                return Ok(new { message = "User deleted successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting user");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error deleting user" });
            }
        }
    }

    public class UserDto
    {
        public int Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public Role Role { get; set; }
        public string? Department { get; set; }
        public bool IsPartTime { get; set; }
        public int WeeklyHours { get; set; }
        public string? Qualification { get; set; }
        public DateTime JoinDate { get; set; }
        public bool IsActive { get; set; }
    }

    public class UpdateUserRequest
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public Role? Role { get; set; }
        public string? Department { get; set; }
        public bool IsPartTime { get; set; }
        public int WeeklyHours { get; set; }
        public string? Qualification { get; set; }
        public bool IsActive { get; set; } = true;
    }
}
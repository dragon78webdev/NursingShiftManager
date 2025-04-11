using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using NurseScheduler.Models;
using NurseScheduler.Services;

namespace NurseScheduler.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IUserService _userService;
        private readonly ILogger<AuthController> _logger;

        public AuthController(
            IAuthService authService,
            IUserService userService,
            ILogger<AuthController> logger)
        {
            _authService = authService;
            _userService = userService;
            _logger = logger;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            try
            {
                var user = await _authService.AuthenticateAsync(request.Email, request.Password);
                
                if (user == null)
                    return Unauthorized(new { message = "Invalid email or password" });
                
                // Check if profile is complete
                if (!user.IsProfileComplete)
                {
                    return Ok(new 
                    { 
                        message = "Profile incomplete",
                        userId = user.Id,
                        email = user.Email,
                        isProfileComplete = false
                    });
                }
                
                // Generate JWT token
                var token = _authService.GenerateJwtToken(user);
                
                return Ok(new
                {
                    id = user.Id,
                    email = user.Email,
                    firstName = user.FirstName,
                    lastName = user.LastName,
                    role = user.Role.ToString(),
                    isHeadNurse = user.Role == Role.HeadNurse,
                    token
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in login");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error logging in" });
            }
        }

        [HttpPost("google-login")]
        public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequest request)
        {
            try
            {
                var user = await _authService.AuthenticateGoogleAsync(request.GoogleId, request.Email);
                
                if (user == null)
                    return Unauthorized(new { message = "Unable to authenticate with Google" });
                
                // Check if profile is complete
                if (!user.IsProfileComplete)
                {
                    return Ok(new 
                    { 
                        message = "Profile incomplete",
                        userId = user.Id,
                        email = user.Email,
                        isProfileComplete = false
                    });
                }
                
                // Generate JWT token
                var token = _authService.GenerateJwtToken(user);
                
                return Ok(new
                {
                    id = user.Id,
                    email = user.Email,
                    firstName = user.FirstName,
                    lastName = user.LastName,
                    role = user.Role.ToString(),
                    isHeadNurse = user.Role == Role.HeadNurse,
                    token
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in Google login");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error logging in with Google" });
            }
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            try
            {
                var user = new User
                {
                    Email = request.Email,
                    FirstName = request.FirstName,
                    LastName = request.LastName,
                    Role = request.Role,
                    IsProfileComplete = true
                };
                
                var result = await _authService.RegisterAsync(user, request.Password);
                
                if (!result)
                    return BadRequest(new { message = "User with this email already exists" });
                
                return Ok(new { message = "Registration successful" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in registration");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error registering user" });
            }
        }

        [HttpPost("complete-profile")]
        public async Task<IActionResult> CompleteProfile([FromBody] CompleteProfileRequest request)
        {
            try
            {
                var result = await _authService.CompleteProfileAsync(
                    request.UserId,
                    request.Role,
                    request.FirstName,
                    request.LastName);
                
                if (!result)
                    return BadRequest(new { message = "Unable to complete profile" });
                
                // Get the updated user
                var user = await _userService.GetUserByIdAsync(request.UserId);
                
                if (user == null)
                    return NotFound(new { message = "User not found" });
                
                // Generate JWT token
                var token = _authService.GenerateJwtToken(user);
                
                return Ok(new
                {
                    id = user.Id,
                    email = user.Email,
                    firstName = user.FirstName,
                    lastName = user.LastName,
                    role = user.Role.ToString(),
                    isHeadNurse = user.Role == Role.HeadNurse,
                    token
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error completing profile");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error completing profile" });
            }
        }

        [Authorize]
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            try
            {
                var userId = int.Parse(User.Identity?.Name ?? "0");
                
                if (userId == 0)
                    return Unauthorized(new { message = "Not authenticated" });
                
                var result = await _authService.ChangePasswordAsync(userId, request.OldPassword, request.NewPassword);
                
                if (!result)
                    return BadRequest(new { message = "Invalid old password" });
                
                return Ok(new { message = "Password changed successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error changing password");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error changing password" });
            }
        }

        [Authorize]
        [HttpGet("me")]
        public async Task<IActionResult> GetCurrentUser()
        {
            try
            {
                var userId = int.Parse(User.Identity?.Name ?? "0");
                
                if (userId == 0)
                    return Unauthorized(new { message = "Not authenticated" });
                
                var user = await _userService.GetUserByIdAsync(userId);
                
                if (user == null)
                    return NotFound(new { message = "User not found" });
                
                bool isHeadNurse = user.Role == Role.HeadNurse;
                bool isHeadNurseOrDelegate = isHeadNurse;
                
                if (!isHeadNurse)
                {
                    isHeadNurseOrDelegate = await _userService.IsHeadNurseOrDelegateAsync(userId);
                }
                
                return Ok(new
                {
                    id = user.Id,
                    email = user.Email,
                    firstName = user.FirstName,
                    lastName = user.LastName,
                    role = user.Role.ToString(),
                    isHeadNurse,
                    isHeadNurseOrDelegate
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting current user");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error getting user information" });
            }
        }
    }

    public class LoginRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class GoogleLoginRequest
    {
        public string GoogleId { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
    }

    public class RegisterRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public Role Role { get; set; }
    }

    public class CompleteProfileRequest
    {
        public int UserId { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public Role Role { get; set; }
    }

    public class ChangePasswordRequest
    {
        public string OldPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }
}
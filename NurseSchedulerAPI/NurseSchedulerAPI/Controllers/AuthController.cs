using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NurseSchedulerAPI.Data;
using NurseSchedulerAPI.Models;
using NurseSchedulerAPI.Services;
using System.Security.Claims;

namespace NurseSchedulerAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly AuthService _authService;
        private readonly ILogger<AuthController> _logger;

        public AuthController(
            ApplicationDbContext context,
            AuthService authService,
            ILogger<AuthController> logger)
        {
            _context = context;
            _authService = authService;
            _logger = logger;
        }

        /// <summary>
        /// Ottiene l'utente corrente
        /// </summary>
        [HttpGet("user")]
        public async Task<ActionResult<User>> GetCurrentUser()
        {
            if (User?.Identity?.IsAuthenticated != true)
            {
                return Unauthorized(new { message = "Not authenticated" });
            }

            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
            var user = await _context.Users
                .Include(u => u.Staff)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            return Ok(user);
        }

        /// <summary>
        /// Avvia il flusso di autenticazione Google
        /// </summary>
        [HttpGet("google")]
        public IActionResult GoogleLogin()
        {
            var properties = new AuthenticationProperties
            {
                RedirectUri = Url.Action("GoogleCallback"),
                Items =
                {
                    { "returnUrl", Url.Action("Index", "Home") ?? "/" }
                }
            };

            return Challenge(properties, GoogleDefaults.AuthenticationScheme);
        }

        /// <summary>
        /// Callback per l'autenticazione Google
        /// </summary>
        [HttpGet("google-callback")]
        public async Task<IActionResult> GoogleCallback()
        {
            var authenticateResult = await HttpContext.AuthenticateAsync(GoogleDefaults.AuthenticationScheme);

            if (!authenticateResult.Succeeded)
                return BadRequest(new { message = "Authentication failed" });

            var googleId = authenticateResult.Principal.FindFirstValue(ClaimTypes.NameIdentifier);
            var email = authenticateResult.Principal.FindFirstValue(ClaimTypes.Email);
            var name = authenticateResult.Principal.FindFirstValue(ClaimTypes.Name);
            var pictureUrl = authenticateResult.Principal.FindFirstValue("picture");
            
            if (string.IsNullOrEmpty(googleId) || string.IsNullOrEmpty(email))
                return BadRequest(new { message = "Invalid Google account info" });

            // Cerca o crea l'utente
            var user = await _authService.FindOrCreateUserFromGoogleAsync(googleId, email, name, pictureUrl);

            // Crea le claims per l'utente
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Name, user.Name),
                new Claim(ClaimTypes.Role, user.Role.ToString())
            };

            var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
            var principal = new ClaimsPrincipal(identity);

            await HttpContext.SignInAsync(
                CookieAuthenticationDefaults.AuthenticationScheme,
                principal,
                new AuthenticationProperties { IsPersistent = true });

            // Genera un JWT token
            var token = _authService.GenerateJwtToken(user);

            // Se è il primo accesso (ruolo non impostato), reindirizza alla pagina di selezione ruolo
            var returnUrl = authenticateResult.Properties.Items["returnUrl"] ?? "/";
            if (user.Role == null)
            {
                returnUrl = "/select-role";
            }

            // Reindirizza con token in query string
            return Redirect($"{returnUrl}?token={token}");
        }

        /// <summary>
        /// Login con email e password (per testing)
        /// </summary>
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginModel model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == model.Email);

            if (user == null)
                return Unauthorized(new { message = "Invalid credentials" });

            // Genera un JWT token
            var token = _authService.GenerateJwtToken(user);

            return Ok(new { token, user });
        }

        /// <summary>
        /// Aggiorna il ruolo dell'utente (usato al primo accesso)
        /// </summary>
        [HttpPut("role")]
        [Authorize]
        public async Task<IActionResult> UpdateRole([FromBody] UpdateRoleModel model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
            
            try
            {
                var user = await _authService.UpdateUserRoleAsync(userId, model.Role);
                return Ok(user);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "User not found" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating user role");
                return StatusCode(500, new { message = "An error occurred while updating the role" });
            }
        }

        /// <summary>
        /// Esegue il logout
        /// </summary>
        [HttpPost("logout")]
        [Authorize]
        public async Task<IActionResult> Logout()
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Ok(new { message = "Logged out successfully" });
        }
    }

    public class LoginModel
    {
        public string Email { get; set; } = "";
        public string Password { get; set; } = "";
    }

    public class UpdateRoleModel
    {
        public Role Role { get; set; }
    }
}
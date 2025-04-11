using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using NurseSchedulerAPI.Data;
using NurseSchedulerAPI.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace NurseSchedulerAPI.Services
{
    public class AuthService
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AuthService> _logger;

        public AuthService(
            ApplicationDbContext context,
            IConfiguration configuration,
            ILogger<AuthService> logger)
        {
            _context = context;
            _configuration = configuration;
            _logger = logger;
        }

        /// <summary>
        /// Cerca o crea un utente in base alle informazioni di Google
        /// </summary>
        public async Task<User> FindOrCreateUserFromGoogleAsync(string googleId, string email, string name, string? pictureUrl)
        {
            try
            {
                // Cerca l'utente per googleId
                var user = await _context.Users.FirstOrDefaultAsync(u => u.GoogleId == googleId);

                // Se non esiste, cerca per email
                if (user == null)
                {
                    user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);

                    // Se esiste per email ma non ha googleId, aggiorna il googleId
                    if (user != null)
                    {
                        user.GoogleId = googleId;
                        user.PictureUrl = pictureUrl;
                        await _context.SaveChangesAsync();
                    }
                }

                // Se non esiste né per googleId né per email, crealo
                if (user == null)
                {
                    user = new User
                    {
                        GoogleId = googleId,
                        Email = email,
                        Name = name,
                        PictureUrl = pictureUrl,
                        Role = Role.Nurse,  // Ruolo predefinito, da modificare alla prima accesso
                        CreatedAt = DateTime.UtcNow,
                        IsActive = true
                    };

                    _context.Users.Add(user);
                    await _context.SaveChangesAsync();
                }

                return user;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Errore durante il recupero o la creazione dell'utente");
                throw;
            }
        }

        /// <summary>
        /// Genera un token JWT per l'utente
        /// </summary>
        public string GenerateJwtToken(User user)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_configuration["JwtSettings:Secret"] ?? "Default-Secret-Key-Should-Be-Changed-In-Production");
            
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Name, user.Name),
                new Claim(ClaimTypes.Role, user.Role.ToString())
            };

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddDays(7), // Token valido per 7 giorni
                SigningCredentials = new SigningCredentials(
                    new SymmetricSecurityKey(key),
                    SecurityAlgorithms.HmacSha256Signature
                ),
                Issuer = _configuration["JwtSettings:Issuer"],
                Audience = _configuration["JwtSettings:Audience"]
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        /// <summary>
        /// Aggiorna il ruolo dell'utente
        /// </summary>
        public async Task<User> UpdateUserRoleAsync(int userId, Role role)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                throw new KeyNotFoundException($"Utente con ID {userId} non trovato");
            }

            user.Role = role;
            await _context.SaveChangesAsync();

            return user;
        }
    }
}
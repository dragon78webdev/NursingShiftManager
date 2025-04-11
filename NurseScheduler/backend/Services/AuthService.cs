using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using NurseScheduler.Models;
using NurseScheduler.Repositories;

namespace NurseScheduler.Services
{
    public class AuthService : IAuthService
    {
        private readonly IUserRepository _userRepository;
        private readonly IStaffRepository _staffRepository;
        private readonly IConfiguration _configuration;

        public AuthService(
            IUserRepository userRepository,
            IStaffRepository staffRepository,
            IConfiguration configuration)
        {
            _userRepository = userRepository;
            _staffRepository = staffRepository;
            _configuration = configuration;
        }

        public async Task<User?> AuthenticateAsync(string email, string password)
        {
            var user = await _userRepository.GetByEmailAsync(email);
            if (user == null)
                return null;

            if (!VerifyPassword(password, user.PasswordHash, user.PasswordSalt))
                return null;

            return user;
        }

        public async Task<User?> AuthenticateGoogleAsync(string googleId, string email)
        {
            // Check if user exists with this Google ID
            var user = await _userRepository.GetByGoogleIdAsync(googleId);
            
            // If not, check if user exists with this email
            if (user == null)
            {
                user = await _userRepository.GetByEmailAsync(email);
                
                // If user exists with this email but no Google ID, update their Google ID
                if (user != null && string.IsNullOrEmpty(user.GoogleId))
                {
                    user.GoogleId = googleId;
                    await _userRepository.UpdateAsync(user);
                }
                
                // If user doesn't exist at all, create a new one with incomplete profile
                if (user == null)
                {
                    var newUser = new User
                    {
                        Email = email,
                        GoogleId = googleId,
                        IsProfileComplete = false,
                        CreatedAt = DateTime.UtcNow
                    };
                    
                    var userId = await _userRepository.CreateAsync(newUser);
                    user = await _userRepository.GetByIdAsync(userId);
                }
            }

            return user;
        }

        public async Task<bool> RegisterAsync(User user, string password)
        {
            // Check if user already exists
            var existingUser = await _userRepository.GetByEmailAsync(user.Email);
            if (existingUser != null)
                return false;
            
            // Create password hash and salt
            CreatePasswordHash(password, out byte[] passwordHash, out byte[] passwordSalt);
            
            user.PasswordHash = passwordHash;
            user.PasswordSalt = passwordSalt;
            user.CreatedAt = DateTime.UtcNow;
            
            var userId = await _userRepository.CreateAsync(user);
            return userId > 0;
        }

        public async Task<bool> ChangePasswordAsync(int userId, string oldPassword, string newPassword)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
                return false;
            
            // Verify old password
            if (!VerifyPassword(oldPassword, user.PasswordHash, user.PasswordSalt))
                return false;
            
            // Create new password hash and salt
            CreatePasswordHash(newPassword, out byte[] passwordHash, out byte[] passwordSalt);
            
            user.PasswordHash = passwordHash;
            user.PasswordSalt = passwordSalt;
            
            return await _userRepository.UpdateAsync(user);
        }

        public string GenerateJwtToken(User user)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_configuration["Jwt:SecretKey"]);
            
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.Name, user.Id.ToString()),
                    new Claim(ClaimTypes.Email, user.Email),
                    new Claim(ClaimTypes.Role, user.Role.ToString())
                }),
                Expires = DateTime.UtcNow.AddDays(7),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };
            
            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        public async Task<bool> CompleteProfileAsync(int userId, Role role, string firstName, string lastName)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
                return false;
            
            user.FirstName = firstName;
            user.LastName = lastName;
            user.Role = role;
            user.IsProfileComplete = true;
            
            var success = await _userRepository.UpdateAsync(user);
            
            // If user is not a head nurse, create a staff record
            if (success && role != Role.HeadNurse)
            {
                var staff = new Staff
                {
                    UserId = userId,
                    IsActive = true,
                    JoinDate = DateTime.UtcNow
                };
                
                await _staffRepository.CreateAsync(staff);
            }
            
            return success;
        }

        private static void CreatePasswordHash(string password, out byte[] passwordHash, out byte[] passwordSalt)
        {
            using var hmac = new HMACSHA512();
            passwordSalt = hmac.Key;
            passwordHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(password));
        }

        private static bool VerifyPassword(string password, byte[] storedHash, byte[] storedSalt)
        {
            using var hmac = new HMACSHA512(storedSalt);
            var computedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(password));
            
            // Compare the computed hash with the stored hash
            for (int i = 0; i < computedHash.Length; i++)
            {
                if (computedHash[i] != storedHash[i])
                    return false;
            }
            
            return true;
        }
    }
}
using System.Data;
using Dapper;
using NurseSchedulerAPI.Data;
using NurseSchedulerAPI.Models;

namespace NurseSchedulerAPI.Repositories
{
    public class UserRepository : IUserRepository
    {
        private readonly DapperContext _context;
        private readonly ILogger<UserRepository> _logger;

        public UserRepository(DapperContext context, ILogger<UserRepository> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Ottiene un utente dal suo ID
        /// </summary>
        public async Task<User?> GetByIdAsync(int id)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    SELECT * FROM Users
                    WHERE Id = @Id";

                return await connection.QueryFirstOrDefaultAsync<User>(query, new { Id = id });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nel recupero dell'utente con ID {id}");
                throw;
            }
        }

        /// <summary>
        /// Ottiene un utente dal suo Google ID
        /// </summary>
        public async Task<User?> GetByGoogleIdAsync(string googleId)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    SELECT * FROM Users
                    WHERE GoogleId = @GoogleId";

                return await connection.QueryFirstOrDefaultAsync<User>(query, new { GoogleId = googleId });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nel recupero dell'utente con GoogleID {googleId}");
                throw;
            }
        }

        /// <summary>
        /// Ottiene un utente dalla sua email
        /// </summary>
        public async Task<User?> GetByEmailAsync(string email)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    SELECT * FROM Users
                    WHERE Email = @Email";

                return await connection.QueryFirstOrDefaultAsync<User>(query, new { Email = email });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nel recupero dell'utente con email {email}");
                throw;
            }
        }

        /// <summary>
        /// Crea un nuovo utente
        /// </summary>
        public async Task<User> CreateAsync(User user)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    INSERT INTO Users (Name, Email, GoogleId, Role, ProfilePicture, IsActive, CreatedAt)
                    VALUES (@Name, @Email, @GoogleId, @Role, @ProfilePicture, @IsActive, @CreatedAt);
                    
                    SELECT * FROM Users WHERE Id = SCOPE_IDENTITY()";

                user.CreatedAt = DateTime.UtcNow;
                user.IsActive = true;

                var createdUser = await connection.QueryFirstOrDefaultAsync<User>(query, user);
                return createdUser ?? throw new Exception("Errore nella creazione dell'utente");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Errore nella creazione dell'utente");
                throw;
            }
        }

        /// <summary>
        /// Aggiorna un utente esistente
        /// </summary>
        public async Task<User?> UpdateAsync(int id, User user)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    UPDATE Users 
                    SET Name = @Name, 
                        Email = @Email, 
                        Role = @Role, 
                        ProfilePicture = @ProfilePicture, 
                        IsActive = @IsActive
                    WHERE Id = @Id;
                    
                    SELECT * FROM Users WHERE Id = @Id";

                user.Id = id;
                return await connection.QueryFirstOrDefaultAsync<User>(query, user);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nell'aggiornamento dell'utente con ID {id}");
                throw;
            }
        }

        /// <summary>
        /// Ottiene tutti gli utenti
        /// </summary>
        public async Task<IEnumerable<User>> GetAllAsync()
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = "SELECT * FROM Users ORDER BY Name";

                return await connection.QueryAsync<User>(query);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Errore nel recupero di tutti gli utenti");
                throw;
            }
        }

        /// <summary>
        /// Ottiene tutti gli utenti con un determinato ruolo
        /// </summary>
        public async Task<IEnumerable<User>> GetByRoleAsync(string role)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    SELECT * FROM Users
                    WHERE Role = @Role
                    ORDER BY Name";

                return await connection.QueryAsync<User>(query, new { Role = role });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nel recupero degli utenti con ruolo {role}");
                throw;
            }
        }

        /// <summary>
        /// Elimina un utente
        /// </summary>
        public async Task<bool> DeleteAsync(int id)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = "DELETE FROM Users WHERE Id = @Id";

                var affectedRows = await connection.ExecuteAsync(query, new { Id = id });
                return affectedRows > 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nell'eliminazione dell'utente con ID {id}");
                throw;
            }
        }

        /// <summary>
        /// Aggiorna il ruolo di un utente
        /// </summary>
        public async Task<User?> UpdateRoleAsync(int id, string role)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    UPDATE Users 
                    SET Role = @Role
                    WHERE Id = @Id;
                    
                    SELECT * FROM Users WHERE Id = @Id";

                return await connection.QueryFirstOrDefaultAsync<User>(query, new { Id = id, Role = role });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nell'aggiornamento del ruolo dell'utente con ID {id}");
                throw;
            }
        }
    }

    public interface IUserRepository
    {
        Task<User?> GetByIdAsync(int id);
        Task<User?> GetByGoogleIdAsync(string googleId);
        Task<User?> GetByEmailAsync(string email);
        Task<User> CreateAsync(User user);
        Task<User?> UpdateAsync(int id, User user);
        Task<IEnumerable<User>> GetAllAsync();
        Task<IEnumerable<User>> GetByRoleAsync(string role);
        Task<bool> DeleteAsync(int id);
        Task<User?> UpdateRoleAsync(int id, string role);
    }
}
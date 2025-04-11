using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Dapper;
using NurseScheduler.Data;
using NurseScheduler.Models;

namespace NurseScheduler.Repositories
{
    public class UserRepository : IUserRepository
    {
        private readonly IDatabaseContext _dbContext;

        public UserRepository(IDatabaseContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<IEnumerable<User>> GetAllAsync()
        {
            using (var connection = _dbContext.CreateConnection())
            {
                return await connection.QueryAsync<User>("SELECT * FROM Users");
            }
        }

        public async Task<User?> GetByIdAsync(int id)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                return await connection.QueryFirstOrDefaultAsync<User>(
                    "SELECT * FROM Users WHERE Id = @Id", 
                    new { Id = id });
            }
        }

        public async Task<User?> GetByEmailAsync(string email)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                return await connection.QueryFirstOrDefaultAsync<User>(
                    "SELECT * FROM Users WHERE Email = @Email", 
                    new { Email = email });
            }
        }

        public async Task<User?> GetByGoogleIdAsync(string googleId)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                return await connection.QueryFirstOrDefaultAsync<User>(
                    "SELECT * FROM Users WHERE GoogleId = @GoogleId", 
                    new { GoogleId = googleId });
            }
        }

        public async Task<IEnumerable<User>> GetByRoleAsync(Role role)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                return await connection.QueryAsync<User>(
                    "SELECT * FROM Users WHERE Role = @Role",
                    new { Role = role });
            }
        }

        public async Task<int> CreateAsync(User entity)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                entity.CreatedAt = DateTime.UtcNow;
                var sql = @"
                    INSERT INTO Users (Email, FirstName, LastName, PasswordHash, Role, GoogleId, CreatedAt, IsFirstLogin) 
                    VALUES (@Email, @FirstName, @LastName, @PasswordHash, @Role, @GoogleId, @CreatedAt, @IsFirstLogin);
                    SELECT CAST(SCOPE_IDENTITY() as int)";
                
                return await connection.QuerySingleAsync<int>(sql, entity);
            }
        }

        public async Task<bool> UpdateAsync(User entity)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                var sql = @"
                    UPDATE Users 
                    SET Email = @Email, 
                        FirstName = @FirstName, 
                        LastName = @LastName, 
                        Role = @Role, 
                        GoogleId = @GoogleId, 
                        IsFirstLogin = @IsFirstLogin
                    WHERE Id = @Id";
                
                var result = await connection.ExecuteAsync(sql, entity);
                return result > 0;
            }
        }

        public async Task<bool> DeleteAsync(int id)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                var result = await connection.ExecuteAsync(
                    "DELETE FROM Users WHERE Id = @Id", 
                    new { Id = id });
                
                return result > 0;
            }
        }

        public async Task<bool> UpdatePasswordAsync(int userId, string passwordHash)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                var result = await connection.ExecuteAsync(
                    "UPDATE Users SET PasswordHash = @PasswordHash WHERE Id = @Id",
                    new { Id = userId, PasswordHash = passwordHash });
                
                return result > 0;
            }
        }

        public async Task<bool> UpdateFirstLoginStatusAsync(int userId, bool isFirstLogin)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                var result = await connection.ExecuteAsync(
                    "UPDATE Users SET IsFirstLogin = @IsFirstLogin WHERE Id = @Id",
                    new { Id = userId, IsFirstLogin = isFirstLogin });
                
                return result > 0;
            }
        }
    }
}
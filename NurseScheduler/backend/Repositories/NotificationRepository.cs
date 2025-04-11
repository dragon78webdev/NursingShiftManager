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
    public class NotificationRepository : INotificationRepository
    {
        private readonly IDatabaseContext _dbContext;

        public NotificationRepository(IDatabaseContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<IEnumerable<Notification>> GetAllAsync()
        {
            using (var connection = _dbContext.CreateConnection())
            {
                return await connection.QueryAsync<Notification>(
                    "SELECT * FROM Notifications ORDER BY CreatedAt DESC");
            }
        }

        public async Task<Notification?> GetByIdAsync(int id)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                return await connection.QueryFirstOrDefaultAsync<Notification>(
                    "SELECT * FROM Notifications WHERE Id = @Id", 
                    new { Id = id });
            }
        }

        public async Task<IEnumerable<Notification>> GetByUserIdAsync(int userId)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                return await connection.QueryAsync<Notification>(
                    "SELECT * FROM Notifications WHERE UserId = @UserId ORDER BY CreatedAt DESC",
                    new { UserId = userId });
            }
        }

        public async Task<IEnumerable<Notification>> GetUnreadByUserIdAsync(int userId)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                return await connection.QueryAsync<Notification>(
                    "SELECT * FROM Notifications WHERE UserId = @UserId AND Read = 0 ORDER BY CreatedAt DESC",
                    new { UserId = userId });
            }
        }

        public async Task<int> CreateAsync(Notification entity)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                entity.CreatedAt = DateTime.UtcNow;
                entity.Read = false;
                
                var sql = @"
                    INSERT INTO Notifications (UserId, Title, Message, Read, CreatedAt) 
                    VALUES (@UserId, @Title, @Message, @Read, @CreatedAt);
                    SELECT CAST(SCOPE_IDENTITY() as int)";
                
                return await connection.QuerySingleAsync<int>(sql, entity);
            }
        }

        public async Task<bool> UpdateAsync(Notification entity)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                var sql = @"
                    UPDATE Notifications 
                    SET Title = @Title, 
                        Message = @Message, 
                        Read = @Read
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
                    "DELETE FROM Notifications WHERE Id = @Id", 
                    new { Id = id });
                
                return result > 0;
            }
        }
    }
}
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
    public class DelegationRepository : IDelegationRepository
    {
        private readonly IDatabaseContext _dbContext;

        public DelegationRepository(IDatabaseContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<IEnumerable<Delegation>> GetAllAsync()
        {
            using (var connection = _dbContext.CreateConnection())
            {
                return await connection.QueryAsync<Delegation>(
                    "SELECT * FROM Delegations");
            }
        }

        public async Task<Delegation?> GetByIdAsync(int id)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                return await connection.QueryFirstOrDefaultAsync<Delegation>(
                    "SELECT * FROM Delegations WHERE Id = @Id", 
                    new { Id = id });
            }
        }

        public async Task<IEnumerable<Delegation>> GetByHeadNurseIdAsync(int headNurseId)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                return await connection.QueryAsync<Delegation>(
                    "SELECT * FROM Delegations WHERE HeadNurseId = @HeadNurseId",
                    new { HeadNurseId = headNurseId });
            }
        }

        public async Task<IEnumerable<Delegation>> GetByDelegateIdAsync(int delegateId)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                return await connection.QueryAsync<Delegation>(
                    "SELECT * FROM Delegations WHERE DelegateId = @DelegateId",
                    new { DelegateId = delegateId });
            }
        }

        public async Task<IEnumerable<Delegation>> GetActiveAsync()
        {
            using (var connection = _dbContext.CreateConnection())
            {
                var now = DateTime.UtcNow;
                return await connection.QueryAsync<Delegation>(
                    "SELECT * FROM Delegations WHERE StartDate <= @Now AND EndDate >= @Now",
                    new { Now = now });
            }
        }

        public async Task<IEnumerable<Delegation>> GetActiveByHeadNurseIdAsync(int headNurseId)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                var now = DateTime.UtcNow;
                return await connection.QueryAsync<Delegation>(
                    "SELECT * FROM Delegations WHERE HeadNurseId = @HeadNurseId AND StartDate <= @Now AND EndDate >= @Now",
                    new { HeadNurseId = headNurseId, Now = now });
            }
        }

        public async Task<bool> IsActiveDelegateAsync(int userId)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                var now = DateTime.UtcNow;
                var count = await connection.ExecuteScalarAsync<int>(
                    "SELECT COUNT(*) FROM Delegations WHERE DelegateId = @UserId AND StartDate <= @Now AND EndDate >= @Now",
                    new { UserId = userId, Now = now });
                
                return count > 0;
            }
        }

        public async Task<int> CreateAsync(Delegation entity)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                entity.CreatedAt = DateTime.UtcNow;
                
                var sql = @"
                    INSERT INTO Delegations (HeadNurseId, DelegateId, StartDate, EndDate, CreatedAt) 
                    VALUES (@HeadNurseId, @DelegateId, @StartDate, @EndDate, @CreatedAt);
                    SELECT CAST(SCOPE_IDENTITY() as int)";
                
                return await connection.QuerySingleAsync<int>(sql, entity);
            }
        }

        public async Task<bool> UpdateAsync(Delegation entity)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                var sql = @"
                    UPDATE Delegations 
                    SET HeadNurseId = @HeadNurseId, 
                        DelegateId = @DelegateId, 
                        StartDate = @StartDate, 
                        EndDate = @EndDate
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
                    "DELETE FROM Delegations WHERE Id = @Id", 
                    new { Id = id });
                
                return result > 0;
            }
        }
    }
}
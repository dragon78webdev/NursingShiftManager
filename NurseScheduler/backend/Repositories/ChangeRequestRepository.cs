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
    public class ChangeRequestRepository : IChangeRequestRepository
    {
        private readonly IDatabaseContext _dbContext;

        public ChangeRequestRepository(IDatabaseContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<IEnumerable<ChangeRequest>> GetAllAsync()
        {
            using (var connection = _dbContext.CreateConnection())
            {
                return await connection.QueryAsync<ChangeRequest>("SELECT * FROM ChangeRequests");
            }
        }

        public async Task<ChangeRequest?> GetByIdAsync(int id)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                return await connection.QueryFirstOrDefaultAsync<ChangeRequest>(
                    "SELECT * FROM ChangeRequests WHERE Id = @Id", 
                    new { Id = id });
            }
        }

        public async Task<IEnumerable<ChangeRequest>> GetByStaffIdAsync(int staffId)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                return await connection.QueryAsync<ChangeRequest>(
                    "SELECT * FROM ChangeRequests WHERE StaffId = @StaffId OR TargetStaffId = @StaffId ORDER BY Date",
                    new { StaffId = staffId });
            }
        }

        public async Task<IEnumerable<ChangeRequest>> GetByStatusAsync(RequestStatus status)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                return await connection.QueryAsync<ChangeRequest>(
                    "SELECT * FROM ChangeRequests WHERE Status = @Status ORDER BY CreatedAt",
                    new { Status = status });
            }
        }

        public async Task<IEnumerable<ChangeRequest>> GetByDateRangeAsync(DateTime startDate, DateTime endDate)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                return await connection.QueryAsync<ChangeRequest>(
                    "SELECT * FROM ChangeRequests WHERE Date BETWEEN @StartDate AND @EndDate ORDER BY Date",
                    new { StartDate = startDate, EndDate = endDate });
            }
        }

        public async Task<IEnumerable<ChangeRequest>> GetActiveRequestsAsync()
        {
            using (var connection = _dbContext.CreateConnection())
            {
                // Active requests are those with pending status and date in the future
                return await connection.QueryAsync<ChangeRequest>(
                    "SELECT * FROM ChangeRequests WHERE Status = @Status AND Date >= @Today ORDER BY Date",
                    new { Status = RequestStatus.Pending, Today = DateTime.Today });
            }
        }

        public async Task<int> CreateAsync(ChangeRequest entity)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                // Set default values
                var now = DateTime.UtcNow;
                entity.CreatedAt = now;
                entity.UpdatedAt = now;
                entity.Status = RequestStatus.Pending;
                
                var sql = @"
                    INSERT INTO ChangeRequests (
                        StaffId, 
                        Date, 
                        CurrentShiftType, 
                        RequestedShiftType, 
                        Reason, 
                        Status, 
                        Type, 
                        TargetStaffId, 
                        ApprovedById, 
                        CreatedAt, 
                        UpdatedAt) 
                    VALUES (
                        @StaffId, 
                        @Date, 
                        @CurrentShiftType, 
                        @RequestedShiftType, 
                        @Reason, 
                        @Status, 
                        @Type, 
                        @TargetStaffId, 
                        @ApprovedById, 
                        @CreatedAt, 
                        @UpdatedAt);
                    SELECT CAST(SCOPE_IDENTITY() as int)";
                
                return await connection.QuerySingleAsync<int>(sql, entity);
            }
        }

        public async Task<bool> UpdateAsync(ChangeRequest entity)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                entity.UpdatedAt = DateTime.UtcNow;
                
                var sql = @"
                    UPDATE ChangeRequests 
                    SET Date = @Date, 
                        CurrentShiftType = @CurrentShiftType, 
                        RequestedShiftType = @RequestedShiftType, 
                        Reason = @Reason,
                        Status = @Status,
                        Type = @Type,
                        TargetStaffId = @TargetStaffId,
                        ApprovedById = @ApprovedById,
                        UpdatedAt = @UpdatedAt
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
                    "DELETE FROM ChangeRequests WHERE Id = @Id", 
                    new { Id = id });
                
                return result > 0;
            }
        }
    }
}
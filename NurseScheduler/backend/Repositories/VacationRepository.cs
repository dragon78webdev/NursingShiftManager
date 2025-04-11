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
    public class VacationRepository : IVacationRepository
    {
        private readonly IDatabaseContext _dbContext;

        public VacationRepository(IDatabaseContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<IEnumerable<Vacation>> GetAllAsync()
        {
            using (var connection = _dbContext.CreateConnection())
            {
                return await connection.QueryAsync<Vacation>("SELECT * FROM Vacations");
            }
        }

        public async Task<Vacation?> GetByIdAsync(int id)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                return await connection.QueryFirstOrDefaultAsync<Vacation>(
                    "SELECT * FROM Vacations WHERE Id = @Id", 
                    new { Id = id });
            }
        }

        public async Task<IEnumerable<Vacation>> GetByStaffIdAsync(int staffId)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                return await connection.QueryAsync<Vacation>(
                    "SELECT * FROM Vacations WHERE StaffId = @StaffId ORDER BY StartDate",
                    new { StaffId = staffId });
            }
        }

        public async Task<IEnumerable<Vacation>> GetByDateRangeAsync(DateTime startDate, DateTime endDate)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                return await connection.QueryAsync<Vacation>(
                    @"SELECT * FROM Vacations 
                    WHERE (StartDate BETWEEN @StartDate AND @EndDate) 
                    OR (EndDate BETWEEN @StartDate AND @EndDate)
                    OR (StartDate <= @StartDate AND EndDate >= @EndDate)
                    ORDER BY StartDate",
                    new { StartDate = startDate, EndDate = endDate });
            }
        }

        public async Task<IEnumerable<Vacation>> GetByStaffAndDateRangeAsync(int staffId, DateTime startDate, DateTime endDate)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                return await connection.QueryAsync<Vacation>(
                    @"SELECT * FROM Vacations 
                    WHERE StaffId = @StaffId 
                    AND ((StartDate BETWEEN @StartDate AND @EndDate) 
                    OR (EndDate BETWEEN @StartDate AND @EndDate)
                    OR (StartDate <= @StartDate AND EndDate >= @EndDate))
                    ORDER BY StartDate",
                    new { StaffId = staffId, StartDate = startDate, EndDate = endDate });
            }
        }

        public async Task<int> CreateAsync(Vacation entity)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                entity.CreatedAt = DateTime.UtcNow;
                
                var sql = @"
                    INSERT INTO Vacations (StaffId, StartDate, EndDate, Reason, ApprovedById, CreatedAt) 
                    VALUES (@StaffId, @StartDate, @EndDate, @Reason, @ApprovedById, @CreatedAt);
                    SELECT CAST(SCOPE_IDENTITY() as int)";
                
                return await connection.QuerySingleAsync<int>(sql, entity);
            }
        }

        public async Task<bool> UpdateAsync(Vacation entity)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                var sql = @"
                    UPDATE Vacations 
                    SET StartDate = @StartDate, 
                        EndDate = @EndDate, 
                        Reason = @Reason,
                        ApprovedById = @ApprovedById
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
                    "DELETE FROM Vacations WHERE Id = @Id", 
                    new { Id = id });
                
                return result > 0;
            }
        }
    }
}
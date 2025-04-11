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
    public class ShiftRepository : IShiftRepository
    {
        private readonly IDatabaseContext _dbContext;

        public ShiftRepository(IDatabaseContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<IEnumerable<Shift>> GetAllAsync()
        {
            using (var connection = _dbContext.CreateConnection())
            {
                return await connection.QueryAsync<Shift>("SELECT * FROM Shifts");
            }
        }

        public async Task<Shift?> GetByIdAsync(int id)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                return await connection.QueryFirstOrDefaultAsync<Shift>(
                    "SELECT * FROM Shifts WHERE Id = @Id", 
                    new { Id = id });
            }
        }

        public async Task<IEnumerable<Shift>> GetByStaffIdAsync(int staffId)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                return await connection.QueryAsync<Shift>(
                    "SELECT * FROM Shifts WHERE StaffId = @StaffId ORDER BY Date",
                    new { StaffId = staffId });
            }
        }

        public async Task<IEnumerable<Shift>> GetByDateRangeAsync(DateTime startDate, DateTime endDate)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                return await connection.QueryAsync<Shift>(
                    "SELECT * FROM Shifts WHERE Date >= @StartDate AND Date <= @EndDate ORDER BY Date, StaffId",
                    new { StartDate = startDate, EndDate = endDate });
            }
        }

        public async Task<IEnumerable<Shift>> GetByStaffAndDateRangeAsync(int staffId, DateTime startDate, DateTime endDate)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                return await connection.QueryAsync<Shift>(
                    "SELECT * FROM Shifts WHERE StaffId = @StaffId AND Date >= @StartDate AND Date <= @EndDate ORDER BY Date",
                    new { StaffId = staffId, StartDate = startDate, EndDate = endDate });
            }
        }

        public async Task<IEnumerable<Shift>> GetByRoleAndDateRangeAsync(Role role, DateTime startDate, DateTime endDate)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                var query = @"
                    SELECT s.* 
                    FROM Shifts s
                    INNER JOIN Staff sf ON s.StaffId = sf.Id
                    INNER JOIN Users u ON sf.UserId = u.Id
                    WHERE u.Role = @Role AND s.Date >= @StartDate AND s.Date <= @EndDate
                    ORDER BY s.Date, s.StaffId";

                return await connection.QueryAsync<Shift>(query,
                    new { Role = role, StartDate = startDate, EndDate = endDate });
            }
        }

        public async Task<IEnumerable<Shift>> GetByDepartmentAndDateRangeAsync(string department, DateTime startDate, DateTime endDate)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                var query = @"
                    SELECT s.* 
                    FROM Shifts s
                    INNER JOIN Staff sf ON s.StaffId = sf.Id
                    WHERE sf.Department = @Department AND s.Date >= @StartDate AND s.Date <= @EndDate
                    ORDER BY s.Date, s.StaffId";

                return await connection.QueryAsync<Shift>(query,
                    new { Department = department, StartDate = startDate, EndDate = endDate });
            }
        }

        public async Task<int> CreateAsync(Shift entity)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                var now = DateTime.UtcNow;
                entity.CreatedAt = now;
                entity.UpdatedAt = now;
                
                var sql = @"
                    INSERT INTO Shifts (StaffId, Date, ShiftType, CreatedAt, UpdatedAt, CreatedById) 
                    VALUES (@StaffId, @Date, @ShiftType, @CreatedAt, @UpdatedAt, @CreatedById);
                    SELECT CAST(SCOPE_IDENTITY() as int)";
                
                return await connection.QuerySingleAsync<int>(sql, entity);
            }
        }

        public async Task<int> BulkCreateAsync(IEnumerable<Shift> shifts)
        {
            if (!shifts.Any())
                return 0;

            using (var connection = _dbContext.CreateConnection())
            {
                connection.Open();
                using (var transaction = connection.BeginTransaction())
                {
                    try
                    {
                        var now = DateTime.UtcNow;
                        var sql = @"
                            INSERT INTO Shifts (StaffId, Date, ShiftType, CreatedAt, UpdatedAt, CreatedById) 
                            VALUES (@StaffId, @Date, @ShiftType, @CreatedAt, @UpdatedAt, @CreatedById)";

                        foreach (var shift in shifts)
                        {
                            shift.CreatedAt = now;
                            shift.UpdatedAt = now;
                        }

                        var rowsAffected = await connection.ExecuteAsync(sql, shifts, transaction);
                        transaction.Commit();
                        return rowsAffected;
                    }
                    catch
                    {
                        transaction.Rollback();
                        throw;
                    }
                }
            }
        }

        public async Task<bool> UpdateAsync(Shift entity)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                entity.UpdatedAt = DateTime.UtcNow;
                
                var sql = @"
                    UPDATE Shifts 
                    SET ShiftType = @ShiftType, 
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
                    "DELETE FROM Shifts WHERE Id = @Id", 
                    new { Id = id });
                
                return result > 0;
            }
        }
    }
}
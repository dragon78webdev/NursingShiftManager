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
    public class StaffRepository : IStaffRepository
    {
        private readonly IDatabaseContext _dbContext;

        public StaffRepository(IDatabaseContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<IEnumerable<Staff>> GetAllAsync()
        {
            using (var connection = _dbContext.CreateConnection())
            {
                return await connection.QueryAsync<Staff>("SELECT * FROM Staff");
            }
        }

        public async Task<Staff?> GetByIdAsync(int id)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                return await connection.QueryFirstOrDefaultAsync<Staff>(
                    "SELECT * FROM Staff WHERE Id = @Id", 
                    new { Id = id });
            }
        }

        public async Task<Staff?> GetByUserIdAsync(int userId)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                return await connection.QueryFirstOrDefaultAsync<Staff>(
                    "SELECT * FROM Staff WHERE UserId = @UserId", 
                    new { UserId = userId });
            }
        }

        public async Task<IEnumerable<Staff>> GetByRoleAsync(Role role)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                return await connection.QueryAsync<Staff, User, Staff>(
                    @"SELECT s.*, u.* 
                      FROM Staff s
                      INNER JOIN Users u ON s.UserId = u.Id
                      WHERE u.Role = @Role",
                    (staff, user) => 
                    {
                        staff.User = user;
                        return staff;
                    },
                    new { Role = role },
                    splitOn: "Id");
            }
        }

        public async Task<IEnumerable<Staff>> GetByDepartmentAsync(string department)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                return await connection.QueryAsync<Staff>(
                    "SELECT * FROM Staff WHERE Department = @Department",
                    new { Department = department });
            }
        }

        public async Task<IEnumerable<Staff>> GetActiveStaffAsync()
        {
            using (var connection = _dbContext.CreateConnection())
            {
                return await connection.QueryAsync<Staff>(
                    "SELECT * FROM Staff WHERE IsActive = 1");
            }
        }

        public async Task<IEnumerable<Staff>> GetStaffWithUserAsync()
        {
            using (var connection = _dbContext.CreateConnection())
            {
                return await connection.QueryAsync<Staff, User, Staff>(
                    @"SELECT s.*, u.* 
                      FROM Staff s
                      INNER JOIN Users u ON s.UserId = u.Id",
                    (staff, user) => 
                    {
                        staff.User = user;
                        return staff;
                    },
                    splitOn: "Id");
            }
        }

        public async Task<int> CreateAsync(Staff entity)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                entity.JoinDate = entity.JoinDate == default ? DateTime.UtcNow : entity.JoinDate;
                
                var sql = @"
                    INSERT INTO Staff (UserId, Department, IsPartTime, WeeklyHours, Qualification, JoinDate, IsActive) 
                    VALUES (@UserId, @Department, @IsPartTime, @WeeklyHours, @Qualification, @JoinDate, @IsActive);
                    SELECT CAST(SCOPE_IDENTITY() as int)";
                
                return await connection.QuerySingleAsync<int>(sql, entity);
            }
        }

        public async Task<bool> UpdateAsync(Staff entity)
        {
            using (var connection = _dbContext.CreateConnection())
            {
                var sql = @"
                    UPDATE Staff 
                    SET Department = @Department, 
                        IsPartTime = @IsPartTime, 
                        WeeklyHours = @WeeklyHours, 
                        Qualification = @Qualification,
                        IsActive = @IsActive
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
                    "DELETE FROM Staff WHERE Id = @Id", 
                    new { Id = id });
                
                return result > 0;
            }
        }
    }
}
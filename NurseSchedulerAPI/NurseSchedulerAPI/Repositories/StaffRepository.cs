using System.Data;
using Dapper;
using NurseSchedulerAPI.Data;
using NurseSchedulerAPI.Models;

namespace NurseSchedulerAPI.Repositories
{
    public class StaffRepository : IStaffRepository
    {
        private readonly DapperContext _context;
        private readonly ILogger<StaffRepository> _logger;

        public StaffRepository(DapperContext context, ILogger<StaffRepository> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Ottiene un membro del personale dal suo ID
        /// </summary>
        public async Task<Staff?> GetByIdAsync(int id)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    SELECT s.*, u.*
                    FROM Staff s
                    LEFT JOIN Users u ON s.UserId = u.Id
                    WHERE s.Id = @Id";

                var staffDict = new Dictionary<int, Staff>();

                var result = await connection.QueryAsync<Staff, User, Staff>(
                    query,
                    (staff, user) =>
                    {
                        if (!staffDict.TryGetValue(staff.Id, out var existingStaff))
                        {
                            existingStaff = staff;
                            existingStaff.User = user;
                            staffDict.Add(existingStaff.Id, existingStaff);
                        }

                        return existingStaff;
                    },
                    new { Id = id },
                    splitOn: "Id"
                );

                return result.FirstOrDefault();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nel recupero dello staff con ID {id}");
                throw;
            }
        }

        /// <summary>
        /// Ottiene un membro del personale dall'ID utente associato
        /// </summary>
        public async Task<Staff?> GetByUserIdAsync(int userId)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    SELECT s.*, u.*
                    FROM Staff s
                    LEFT JOIN Users u ON s.UserId = u.Id
                    WHERE s.UserId = @UserId";

                var staffDict = new Dictionary<int, Staff>();

                var result = await connection.QueryAsync<Staff, User, Staff>(
                    query,
                    (staff, user) =>
                    {
                        if (!staffDict.TryGetValue(staff.Id, out var existingStaff))
                        {
                            existingStaff = staff;
                            existingStaff.User = user;
                            staffDict.Add(existingStaff.Id, existingStaff);
                        }

                        return existingStaff;
                    },
                    new { UserId = userId },
                    splitOn: "Id"
                );

                return result.FirstOrDefault();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nel recupero dello staff con UserId {userId}");
                throw;
            }
        }

        /// <summary>
        /// Crea un nuovo membro del personale
        /// </summary>
        public async Task<Staff> CreateAsync(Staff staff)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    INSERT INTO Staff (UserId, Name, Role, Department, WorkingPercentage, YearsOfExperience, AvailableForExtraShifts, EmergencyContact)
                    VALUES (@UserId, @Name, @Role, @Department, @WorkingPercentage, @YearsOfExperience, @AvailableForExtraShifts, @EmergencyContact);
                    
                    SELECT s.*, u.*
                    FROM Staff s
                    LEFT JOIN Users u ON s.UserId = u.Id
                    WHERE s.Id = SCOPE_IDENTITY()";

                var staffDict = new Dictionary<int, Staff>();

                var result = await connection.QueryAsync<Staff, User, Staff>(
                    query,
                    (newStaff, user) =>
                    {
                        newStaff.User = user;
                        return newStaff;
                    },
                    staff,
                    splitOn: "Id"
                );

                var createdStaff = result.FirstOrDefault();
                return createdStaff ?? throw new Exception("Errore nella creazione dello staff");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Errore nella creazione dello staff");
                throw;
            }
        }

        /// <summary>
        /// Aggiorna un membro del personale esistente
        /// </summary>
        public async Task<Staff?> UpdateAsync(int id, Staff staff)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    UPDATE Staff 
                    SET Name = @Name, 
                        Role = @Role, 
                        Department = @Department, 
                        WorkingPercentage = @WorkingPercentage, 
                        YearsOfExperience = @YearsOfExperience, 
                        AvailableForExtraShifts = @AvailableForExtraShifts, 
                        EmergencyContact = @EmergencyContact
                    WHERE Id = @Id;
                    
                    SELECT s.*, u.*
                    FROM Staff s
                    LEFT JOIN Users u ON s.UserId = u.Id
                    WHERE s.Id = @Id";

                staff.Id = id;

                var staffDict = new Dictionary<int, Staff>();

                var result = await connection.QueryAsync<Staff, User, Staff>(
                    query,
                    (updatedStaff, user) =>
                    {
                        updatedStaff.User = user;
                        return updatedStaff;
                    },
                    staff,
                    splitOn: "Id"
                );

                return result.FirstOrDefault();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nell'aggiornamento dello staff con ID {id}");
                throw;
            }
        }

        /// <summary>
        /// Ottiene tutti i membri del personale
        /// </summary>
        public async Task<IEnumerable<Staff>> GetAllAsync()
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    SELECT s.*, u.*
                    FROM Staff s
                    LEFT JOIN Users u ON s.UserId = u.Id
                    ORDER BY s.Name";

                var staffDict = new Dictionary<int, Staff>();

                var result = await connection.QueryAsync<Staff, User, Staff>(
                    query,
                    (staff, user) =>
                    {
                        if (!staffDict.TryGetValue(staff.Id, out var existingStaff))
                        {
                            existingStaff = staff;
                            existingStaff.User = user;
                            staffDict.Add(existingStaff.Id, existingStaff);
                        }

                        return existingStaff;
                    },
                    splitOn: "Id"
                );

                return staffDict.Values;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Errore nel recupero di tutto lo staff");
                throw;
            }
        }

        /// <summary>
        /// Ottiene tutti i membri del personale con un determinato ruolo
        /// </summary>
        public async Task<IEnumerable<Staff>> GetByRoleAsync(string role)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    SELECT s.*, u.*
                    FROM Staff s
                    LEFT JOIN Users u ON s.UserId = u.Id
                    WHERE s.Role = @Role
                    ORDER BY s.Name";

                var staffDict = new Dictionary<int, Staff>();

                var result = await connection.QueryAsync<Staff, User, Staff>(
                    query,
                    (staff, user) =>
                    {
                        if (!staffDict.TryGetValue(staff.Id, out var existingStaff))
                        {
                            existingStaff = staff;
                            existingStaff.User = user;
                            staffDict.Add(existingStaff.Id, existingStaff);
                        }

                        return existingStaff;
                    },
                    new { Role = role },
                    splitOn: "Id"
                );

                return staffDict.Values;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nel recupero dello staff con ruolo {role}");
                throw;
            }
        }

        /// <summary>
        /// Ottiene tutti i membri del personale di un determinato reparto
        /// </summary>
        public async Task<IEnumerable<Staff>> GetByDepartmentAsync(string department)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    SELECT s.*, u.*
                    FROM Staff s
                    LEFT JOIN Users u ON s.UserId = u.Id
                    WHERE s.Department = @Department
                    ORDER BY s.Name";

                var staffDict = new Dictionary<int, Staff>();

                var result = await connection.QueryAsync<Staff, User, Staff>(
                    query,
                    (staff, user) =>
                    {
                        if (!staffDict.TryGetValue(staff.Id, out var existingStaff))
                        {
                            existingStaff = staff;
                            existingStaff.User = user;
                            staffDict.Add(existingStaff.Id, existingStaff);
                        }

                        return existingStaff;
                    },
                    new { Department = department },
                    splitOn: "Id"
                );

                return staffDict.Values;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nel recupero dello staff del reparto {department}");
                throw;
            }
        }

        /// <summary>
        /// Elimina un membro del personale
        /// </summary>
        public async Task<bool> DeleteAsync(int id)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = "DELETE FROM Staff WHERE Id = @Id";

                var affectedRows = await connection.ExecuteAsync(query, new { Id = id });
                return affectedRows > 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nell'eliminazione dello staff con ID {id}");
                throw;
            }
        }
    }

    public interface IStaffRepository
    {
        Task<Staff?> GetByIdAsync(int id);
        Task<Staff?> GetByUserIdAsync(int userId);
        Task<Staff> CreateAsync(Staff staff);
        Task<Staff?> UpdateAsync(int id, Staff staff);
        Task<IEnumerable<Staff>> GetAllAsync();
        Task<IEnumerable<Staff>> GetByRoleAsync(string role);
        Task<IEnumerable<Staff>> GetByDepartmentAsync(string department);
        Task<bool> DeleteAsync(int id);
    }
}
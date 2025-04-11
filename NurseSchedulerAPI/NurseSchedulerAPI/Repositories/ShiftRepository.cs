using System.Data;
using Dapper;
using NurseSchedulerAPI.Data;
using NurseSchedulerAPI.Models;

namespace NurseSchedulerAPI.Repositories
{
    public class ShiftRepository : IShiftRepository
    {
        private readonly DapperContext _context;
        private readonly ILogger<ShiftRepository> _logger;

        public ShiftRepository(DapperContext context, ILogger<ShiftRepository> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Ottiene un turno dal suo ID
        /// </summary>
        public async Task<Shift?> GetByIdAsync(int id)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    SELECT s.*, st.*
                    FROM Shifts s
                    LEFT JOIN Staff st ON s.StaffId = st.Id
                    WHERE s.Id = @Id";

                var shiftDict = new Dictionary<int, Shift>();

                var result = await connection.QueryAsync<Shift, Staff, Shift>(
                    query,
                    (shift, staff) =>
                    {
                        if (!shiftDict.TryGetValue(shift.Id, out var existingShift))
                        {
                            existingShift = shift;
                            existingShift.Staff = staff;
                            shiftDict.Add(existingShift.Id, existingShift);
                        }

                        return existingShift;
                    },
                    new { Id = id },
                    splitOn: "Id"
                );

                return result.FirstOrDefault();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nel recupero del turno con ID {id}");
                throw;
            }
        }

        /// <summary>
        /// Crea un nuovo turno
        /// </summary>
        public async Task<Shift> CreateAsync(Shift shift)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    INSERT INTO Shifts (StaffId, Date, ShiftType, Notes, CreatedAt, UpdatedAt)
                    VALUES (@StaffId, @Date, @ShiftType, @Notes, @CreatedAt, @UpdatedAt);
                    
                    SELECT s.*, st.*
                    FROM Shifts s
                    LEFT JOIN Staff st ON s.StaffId = st.Id
                    WHERE s.Id = SCOPE_IDENTITY()";

                shift.CreatedAt = DateTime.UtcNow;

                var shiftDict = new Dictionary<int, Shift>();

                var result = await connection.QueryAsync<Shift, Staff, Shift>(
                    query,
                    (newShift, staff) =>
                    {
                        newShift.Staff = staff;
                        return newShift;
                    },
                    shift,
                    splitOn: "Id"
                );

                var createdShift = result.FirstOrDefault();
                return createdShift ?? throw new Exception("Errore nella creazione del turno");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Errore nella creazione del turno");
                throw;
            }
        }

        /// <summary>
        /// Aggiorna un turno esistente
        /// </summary>
        public async Task<Shift?> UpdateAsync(int id, Shift shift)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    UPDATE Shifts 
                    SET ShiftType = @ShiftType, 
                        Notes = @Notes, 
                        UpdatedAt = @UpdatedAt
                    WHERE Id = @Id;
                    
                    SELECT s.*, st.*
                    FROM Shifts s
                    LEFT JOIN Staff st ON s.StaffId = st.Id
                    WHERE s.Id = @Id";

                shift.Id = id;
                shift.UpdatedAt = DateTime.UtcNow;

                var shiftDict = new Dictionary<int, Shift>();

                var result = await connection.QueryAsync<Shift, Staff, Shift>(
                    query,
                    (updatedShift, staff) =>
                    {
                        updatedShift.Staff = staff;
                        return updatedShift;
                    },
                    shift,
                    splitOn: "Id"
                );

                return result.FirstOrDefault();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nell'aggiornamento del turno con ID {id}");
                throw;
            }
        }

        /// <summary>
        /// Ottiene tutti i turni di un membro dello staff
        /// </summary>
        public async Task<IEnumerable<Shift>> GetByStaffIdAsync(int staffId)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    SELECT s.*, st.*
                    FROM Shifts s
                    LEFT JOIN Staff st ON s.StaffId = st.Id
                    WHERE s.StaffId = @StaffId
                    ORDER BY s.Date";

                var shiftDict = new Dictionary<int, Shift>();

                var result = await connection.QueryAsync<Shift, Staff, Shift>(
                    query,
                    (shift, staff) =>
                    {
                        if (!shiftDict.TryGetValue(shift.Id, out var existingShift))
                        {
                            existingShift = shift;
                            existingShift.Staff = staff;
                            shiftDict.Add(existingShift.Id, existingShift);
                        }

                        return existingShift;
                    },
                    new { StaffId = staffId },
                    splitOn: "Id"
                );

                return shiftDict.Values;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nel recupero dei turni per lo staff con ID {staffId}");
                throw;
            }
        }

        /// <summary>
        /// Ottiene tutti i turni in un intervallo di date
        /// </summary>
        public async Task<IEnumerable<Shift>> GetByDateRangeAsync(DateTime startDate, DateTime endDate)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    SELECT s.*, st.*
                    FROM Shifts s
                    LEFT JOIN Staff st ON s.StaffId = st.Id
                    WHERE s.Date >= @StartDate AND s.Date <= @EndDate
                    ORDER BY s.Date, s.StaffId";

                var shiftDict = new Dictionary<int, Shift>();

                var result = await connection.QueryAsync<Shift, Staff, Shift>(
                    query,
                    (shift, staff) =>
                    {
                        if (!shiftDict.TryGetValue(shift.Id, out var existingShift))
                        {
                            existingShift = shift;
                            existingShift.Staff = staff;
                            shiftDict.Add(existingShift.Id, existingShift);
                        }

                        return existingShift;
                    },
                    new { StartDate = startDate.Date, EndDate = endDate.Date },
                    splitOn: "Id"
                );

                return shiftDict.Values;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nel recupero dei turni dal {startDate:yyyy-MM-dd} al {endDate:yyyy-MM-dd}");
                throw;
            }
        }

        /// <summary>
        /// Ottiene tutti i turni di un membro dello staff in un intervallo di date
        /// </summary>
        public async Task<IEnumerable<Shift>> GetByStaffIdAndDateRangeAsync(int staffId, DateTime startDate, DateTime endDate)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    SELECT s.*, st.*
                    FROM Shifts s
                    LEFT JOIN Staff st ON s.StaffId = st.Id
                    WHERE s.StaffId = @StaffId AND s.Date >= @StartDate AND s.Date <= @EndDate
                    ORDER BY s.Date";

                var shiftDict = new Dictionary<int, Shift>();

                var result = await connection.QueryAsync<Shift, Staff, Shift>(
                    query,
                    (shift, staff) =>
                    {
                        if (!shiftDict.TryGetValue(shift.Id, out var existingShift))
                        {
                            existingShift = shift;
                            existingShift.Staff = staff;
                            shiftDict.Add(existingShift.Id, existingShift);
                        }

                        return existingShift;
                    },
                    new { StaffId = staffId, StartDate = startDate.Date, EndDate = endDate.Date },
                    splitOn: "Id"
                );

                return shiftDict.Values;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nel recupero dei turni per lo staff {staffId} dal {startDate:yyyy-MM-dd} al {endDate:yyyy-MM-dd}");
                throw;
            }
        }

        /// <summary>
        /// Ottiene tutti i turni per un tipo di turno e un intervallo di date
        /// </summary>
        public async Task<IEnumerable<Shift>> GetByShiftTypeAndDateRangeAsync(string shiftType, DateTime startDate, DateTime endDate)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    SELECT s.*, st.*
                    FROM Shifts s
                    LEFT JOIN Staff st ON s.StaffId = st.Id
                    WHERE s.ShiftType = @ShiftType AND s.Date >= @StartDate AND s.Date <= @EndDate
                    ORDER BY s.Date, s.StaffId";

                var shiftDict = new Dictionary<int, Shift>();

                var result = await connection.QueryAsync<Shift, Staff, Shift>(
                    query,
                    (shift, staff) =>
                    {
                        if (!shiftDict.TryGetValue(shift.Id, out var existingShift))
                        {
                            existingShift = shift;
                            existingShift.Staff = staff;
                            shiftDict.Add(existingShift.Id, existingShift);
                        }

                        return existingShift;
                    },
                    new { ShiftType = shiftType, StartDate = startDate.Date, EndDate = endDate.Date },
                    splitOn: "Id"
                );

                return shiftDict.Values;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nel recupero dei turni di tipo {shiftType} dal {startDate:yyyy-MM-dd} al {endDate:yyyy-MM-dd}");
                throw;
            }
        }

        /// <summary>
        /// Elimina un turno
        /// </summary>
        public async Task<bool> DeleteAsync(int id)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = "DELETE FROM Shifts WHERE Id = @Id";

                var affectedRows = await connection.ExecuteAsync(query, new { Id = id });
                return affectedRows > 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nell'eliminazione del turno con ID {id}");
                throw;
            }
        }

        /// <summary>
        /// Elimina tutti i turni in un intervallo di date
        /// </summary>
        public async Task<int> DeleteByDateRangeAsync(DateTime startDate, DateTime endDate)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = "DELETE FROM Shifts WHERE Date >= @StartDate AND Date <= @EndDate";

                return await connection.ExecuteAsync(query, new { StartDate = startDate.Date, EndDate = endDate.Date });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nell'eliminazione dei turni dal {startDate:yyyy-MM-dd} al {endDate:yyyy-MM-dd}");
                throw;
            }
        }
    }

    public interface IShiftRepository
    {
        Task<Shift?> GetByIdAsync(int id);
        Task<Shift> CreateAsync(Shift shift);
        Task<Shift?> UpdateAsync(int id, Shift shift);
        Task<IEnumerable<Shift>> GetByStaffIdAsync(int staffId);
        Task<IEnumerable<Shift>> GetByDateRangeAsync(DateTime startDate, DateTime endDate);
        Task<IEnumerable<Shift>> GetByStaffIdAndDateRangeAsync(int staffId, DateTime startDate, DateTime endDate);
        Task<IEnumerable<Shift>> GetByShiftTypeAndDateRangeAsync(string shiftType, DateTime startDate, DateTime endDate);
        Task<bool> DeleteAsync(int id);
        Task<int> DeleteByDateRangeAsync(DateTime startDate, DateTime endDate);
    }
}
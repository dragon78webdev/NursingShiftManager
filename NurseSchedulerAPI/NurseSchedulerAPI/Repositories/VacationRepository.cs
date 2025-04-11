using System.Data;
using Dapper;
using NurseSchedulerAPI.Data;
using NurseSchedulerAPI.Models;

namespace NurseSchedulerAPI.Repositories
{
    public class VacationRepository : IVacationRepository
    {
        private readonly DapperContext _context;
        private readonly ILogger<VacationRepository> _logger;

        public VacationRepository(DapperContext context, ILogger<VacationRepository> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Ottiene una vacanza dal suo ID
        /// </summary>
        public async Task<Vacation?> GetByIdAsync(int id)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    SELECT v.*, s.*
                    FROM Vacations v
                    LEFT JOIN Staff s ON v.StaffId = s.Id
                    WHERE v.Id = @Id";

                var vacationDict = new Dictionary<int, Vacation>();

                var result = await connection.QueryAsync<Vacation, Staff, Vacation>(
                    query,
                    (vacation, staff) =>
                    {
                        if (!vacationDict.TryGetValue(vacation.Id, out var existingVacation))
                        {
                            existingVacation = vacation;
                            existingVacation.Staff = staff;
                            vacationDict.Add(existingVacation.Id, existingVacation);
                        }

                        return existingVacation;
                    },
                    new { Id = id },
                    splitOn: "Id"
                );

                return result.FirstOrDefault();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nel recupero delle ferie con ID {id}");
                throw;
            }
        }

        /// <summary>
        /// Crea una nuova richiesta di ferie
        /// </summary>
        public async Task<Vacation> CreateAsync(Vacation vacation)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    INSERT INTO Vacations (StaffId, StartDate, EndDate, Reason, Approved, CreatedAt)
                    VALUES (@StaffId, @StartDate, @EndDate, @Reason, @Approved, @CreatedAt);
                    
                    SELECT v.*, s.*
                    FROM Vacations v
                    LEFT JOIN Staff s ON v.StaffId = s.Id
                    WHERE v.Id = SCOPE_IDENTITY()";

                vacation.CreatedAt = DateTime.UtcNow;

                var vacationDict = new Dictionary<int, Vacation>();

                var result = await connection.QueryAsync<Vacation, Staff, Vacation>(
                    query,
                    (newVacation, staff) =>
                    {
                        newVacation.Staff = staff;
                        return newVacation;
                    },
                    vacation,
                    splitOn: "Id"
                );

                var createdVacation = result.FirstOrDefault();
                return createdVacation ?? throw new Exception("Errore nella creazione delle ferie");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Errore nella creazione delle ferie");
                throw;
            }
        }

        /// <summary>
        /// Aggiorna una richiesta di ferie esistente
        /// </summary>
        public async Task<Vacation?> UpdateAsync(int id, Vacation vacation)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    UPDATE Vacations 
                    SET StartDate = @StartDate, 
                        EndDate = @EndDate, 
                        Reason = @Reason, 
                        Approved = @Approved
                    WHERE Id = @Id;
                    
                    SELECT v.*, s.*
                    FROM Vacations v
                    LEFT JOIN Staff s ON v.StaffId = s.Id
                    WHERE v.Id = @Id";

                vacation.Id = id;

                var vacationDict = new Dictionary<int, Vacation>();

                var result = await connection.QueryAsync<Vacation, Staff, Vacation>(
                    query,
                    (updatedVacation, staff) =>
                    {
                        updatedVacation.Staff = staff;
                        return updatedVacation;
                    },
                    vacation,
                    splitOn: "Id"
                );

                return result.FirstOrDefault();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nell'aggiornamento delle ferie con ID {id}");
                throw;
            }
        }

        /// <summary>
        /// Approva o rifiuta una richiesta di ferie
        /// </summary>
        public async Task<Vacation?> UpdateApprovalStatusAsync(int id, bool approved)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    UPDATE Vacations 
                    SET Approved = @Approved
                    WHERE Id = @Id;
                    
                    SELECT v.*, s.*
                    FROM Vacations v
                    LEFT JOIN Staff s ON v.StaffId = s.Id
                    WHERE v.Id = @Id";

                var vacationDict = new Dictionary<int, Vacation>();

                var result = await connection.QueryAsync<Vacation, Staff, Vacation>(
                    query,
                    (updatedVacation, staff) =>
                    {
                        updatedVacation.Staff = staff;
                        return updatedVacation;
                    },
                    new { Id = id, Approved = approved },
                    splitOn: "Id"
                );

                return result.FirstOrDefault();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nell'aggiornamento dello stato di approvazione delle ferie con ID {id}");
                throw;
            }
        }

        /// <summary>
        /// Ottiene tutte le ferie di un membro dello staff
        /// </summary>
        public async Task<IEnumerable<Vacation>> GetByStaffIdAsync(int staffId)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    SELECT v.*, s.*
                    FROM Vacations v
                    LEFT JOIN Staff s ON v.StaffId = s.Id
                    WHERE v.StaffId = @StaffId
                    ORDER BY v.StartDate DESC";

                var vacationDict = new Dictionary<int, Vacation>();

                var result = await connection.QueryAsync<Vacation, Staff, Vacation>(
                    query,
                    (vacation, staff) =>
                    {
                        if (!vacationDict.TryGetValue(vacation.Id, out var existingVacation))
                        {
                            existingVacation = vacation;
                            existingVacation.Staff = staff;
                            vacationDict.Add(existingVacation.Id, existingVacation);
                        }

                        return existingVacation;
                    },
                    new { StaffId = staffId },
                    splitOn: "Id"
                );

                return vacationDict.Values;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nel recupero delle ferie per lo staff con ID {staffId}");
                throw;
            }
        }

        /// <summary>
        /// Ottiene tutte le ferie in un intervallo di date
        /// </summary>
        public async Task<IEnumerable<Vacation>> GetByDateRangeAsync(DateTime startDate, DateTime endDate)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    SELECT v.*, s.*
                    FROM Vacations v
                    LEFT JOIN Staff s ON v.StaffId = s.Id
                    WHERE (v.StartDate <= @EndDate AND v.EndDate >= @StartDate)
                    ORDER BY v.StartDate, v.StaffId";

                var vacationDict = new Dictionary<int, Vacation>();

                var result = await connection.QueryAsync<Vacation, Staff, Vacation>(
                    query,
                    (vacation, staff) =>
                    {
                        if (!vacationDict.TryGetValue(vacation.Id, out var existingVacation))
                        {
                            existingVacation = vacation;
                            existingVacation.Staff = staff;
                            vacationDict.Add(existingVacation.Id, existingVacation);
                        }

                        return existingVacation;
                    },
                    new { StartDate = startDate.Date, EndDate = endDate.Date },
                    splitOn: "Id"
                );

                return vacationDict.Values;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nel recupero delle ferie dal {startDate:yyyy-MM-dd} al {endDate:yyyy-MM-dd}");
                throw;
            }
        }

        /// <summary>
        /// Ottiene tutte le ferie approvate
        /// </summary>
        public async Task<IEnumerable<Vacation>> GetApprovedVacationsAsync()
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    SELECT v.*, s.*
                    FROM Vacations v
                    LEFT JOIN Staff s ON v.StaffId = s.Id
                    WHERE v.Approved = 1
                    ORDER BY v.StartDate DESC";

                var vacationDict = new Dictionary<int, Vacation>();

                var result = await connection.QueryAsync<Vacation, Staff, Vacation>(
                    query,
                    (vacation, staff) =>
                    {
                        if (!vacationDict.TryGetValue(vacation.Id, out var existingVacation))
                        {
                            existingVacation = vacation;
                            existingVacation.Staff = staff;
                            vacationDict.Add(existingVacation.Id, existingVacation);
                        }

                        return existingVacation;
                    },
                    splitOn: "Id"
                );

                return vacationDict.Values;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Errore nel recupero delle ferie approvate");
                throw;
            }
        }

        /// <summary>
        /// Ottiene tutte le ferie in attesa di approvazione
        /// </summary>
        public async Task<IEnumerable<Vacation>> GetPendingVacationsAsync()
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    SELECT v.*, s.*
                    FROM Vacations v
                    LEFT JOIN Staff s ON v.StaffId = s.Id
                    WHERE v.Approved IS NULL
                    ORDER BY v.StartDate";

                var vacationDict = new Dictionary<int, Vacation>();

                var result = await connection.QueryAsync<Vacation, Staff, Vacation>(
                    query,
                    (vacation, staff) =>
                    {
                        if (!vacationDict.TryGetValue(vacation.Id, out var existingVacation))
                        {
                            existingVacation = vacation;
                            existingVacation.Staff = staff;
                            vacationDict.Add(existingVacation.Id, existingVacation);
                        }

                        return existingVacation;
                    },
                    splitOn: "Id"
                );

                return vacationDict.Values;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Errore nel recupero delle ferie in attesa di approvazione");
                throw;
            }
        }

        /// <summary>
        /// Elimina una richiesta di ferie
        /// </summary>
        public async Task<bool> DeleteAsync(int id)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = "DELETE FROM Vacations WHERE Id = @Id";

                var affectedRows = await connection.ExecuteAsync(query, new { Id = id });
                return affectedRows > 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nell'eliminazione delle ferie con ID {id}");
                throw;
            }
        }
    }

    public interface IVacationRepository
    {
        Task<Vacation?> GetByIdAsync(int id);
        Task<Vacation> CreateAsync(Vacation vacation);
        Task<Vacation?> UpdateAsync(int id, Vacation vacation);
        Task<Vacation?> UpdateApprovalStatusAsync(int id, bool approved);
        Task<IEnumerable<Vacation>> GetByStaffIdAsync(int staffId);
        Task<IEnumerable<Vacation>> GetByDateRangeAsync(DateTime startDate, DateTime endDate);
        Task<IEnumerable<Vacation>> GetApprovedVacationsAsync();
        Task<IEnumerable<Vacation>> GetPendingVacationsAsync();
        Task<bool> DeleteAsync(int id);
    }
}
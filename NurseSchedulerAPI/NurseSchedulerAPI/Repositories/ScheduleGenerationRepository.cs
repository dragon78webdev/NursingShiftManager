using System.Data;
using Dapper;
using NurseSchedulerAPI.Data;
using NurseSchedulerAPI.Models;

namespace NurseSchedulerAPI.Repositories
{
    public class ScheduleGenerationRepository : IScheduleGenerationRepository
    {
        private readonly DapperContext _context;
        private readonly ILogger<ScheduleGenerationRepository> _logger;

        public ScheduleGenerationRepository(DapperContext context, ILogger<ScheduleGenerationRepository> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Ottiene una generazione di planning dal suo ID
        /// </summary>
        public async Task<ScheduleGeneration?> GetByIdAsync(int id)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    SELECT sg.*, u.*
                    FROM ScheduleGenerations sg
                    LEFT JOIN Users u ON sg.GeneratedById = u.Id
                    WHERE sg.Id = @Id";

                var generationDict = new Dictionary<int, ScheduleGeneration>();

                var result = await connection.QueryAsync<ScheduleGeneration, User, ScheduleGeneration>(
                    query,
                    (generation, user) =>
                    {
                        if (!generationDict.TryGetValue(generation.Id, out var existingGeneration))
                        {
                            existingGeneration = generation;
                            existingGeneration.GeneratedBy = user;
                            generationDict.Add(existingGeneration.Id, existingGeneration);
                        }

                        return existingGeneration;
                    },
                    new { Id = id },
                    splitOn: "Id"
                );

                return result.FirstOrDefault();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nel recupero della generazione di planning con ID {id}");
                throw;
            }
        }

        /// <summary>
        /// Crea una nuova registrazione di generazione di planning
        /// </summary>
        public async Task<ScheduleGeneration> CreateAsync(ScheduleGeneration scheduleGeneration)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    INSERT INTO ScheduleGenerations (StartDate, EndDate, StaffType, GeneratedById, Parameters, CreatedAt)
                    VALUES (@StartDate, @EndDate, @StaffType, @GeneratedById, @Parameters, @CreatedAt);
                    
                    SELECT sg.*, u.*
                    FROM ScheduleGenerations sg
                    LEFT JOIN Users u ON sg.GeneratedById = u.Id
                    WHERE sg.Id = SCOPE_IDENTITY()";

                scheduleGeneration.CreatedAt = DateTime.UtcNow;

                var generationDict = new Dictionary<int, ScheduleGeneration>();

                var result = await connection.QueryAsync<ScheduleGeneration, User, ScheduleGeneration>(
                    query,
                    (newGeneration, user) =>
                    {
                        newGeneration.GeneratedBy = user;
                        return newGeneration;
                    },
                    scheduleGeneration,
                    splitOn: "Id"
                );

                var createdGeneration = result.FirstOrDefault();
                return createdGeneration ?? throw new Exception("Errore nella creazione della generazione di planning");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Errore nella creazione della generazione di planning");
                throw;
            }
        }

        /// <summary>
        /// Ottiene tutte le generazioni di planning
        /// </summary>
        public async Task<IEnumerable<ScheduleGeneration>> GetAllAsync()
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    SELECT sg.*, u.*
                    FROM ScheduleGenerations sg
                    LEFT JOIN Users u ON sg.GeneratedById = u.Id
                    ORDER BY sg.CreatedAt DESC";

                var generationDict = new Dictionary<int, ScheduleGeneration>();

                var result = await connection.QueryAsync<ScheduleGeneration, User, ScheduleGeneration>(
                    query,
                    (generation, user) =>
                    {
                        if (!generationDict.TryGetValue(generation.Id, out var existingGeneration))
                        {
                            existingGeneration = generation;
                            existingGeneration.GeneratedBy = user;
                            generationDict.Add(existingGeneration.Id, existingGeneration);
                        }

                        return existingGeneration;
                    },
                    splitOn: "Id"
                );

                return generationDict.Values;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Errore nel recupero di tutte le generazioni di planning");
                throw;
            }
        }

        /// <summary>
        /// Ottiene le generazioni di planning per un tipo di staff
        /// </summary>
        public async Task<IEnumerable<ScheduleGeneration>> GetByStaffTypeAsync(string staffType)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    SELECT sg.*, u.*
                    FROM ScheduleGenerations sg
                    LEFT JOIN Users u ON sg.GeneratedById = u.Id
                    WHERE sg.StaffType = @StaffType
                    ORDER BY sg.CreatedAt DESC";

                var generationDict = new Dictionary<int, ScheduleGeneration>();

                var result = await connection.QueryAsync<ScheduleGeneration, User, ScheduleGeneration>(
                    query,
                    (generation, user) =>
                    {
                        if (!generationDict.TryGetValue(generation.Id, out var existingGeneration))
                        {
                            existingGeneration = generation;
                            existingGeneration.GeneratedBy = user;
                            generationDict.Add(existingGeneration.Id, existingGeneration);
                        }

                        return existingGeneration;
                    },
                    new { StaffType = staffType },
                    splitOn: "Id"
                );

                return generationDict.Values;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nel recupero delle generazioni di planning per il tipo di staff {staffType}");
                throw;
            }
        }

        /// <summary>
        /// Ottiene le generazioni di planning per un intervallo di date
        /// </summary>
        public async Task<IEnumerable<ScheduleGeneration>> GetByDateRangeAsync(DateTime startDate, DateTime endDate)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    SELECT sg.*, u.*
                    FROM ScheduleGenerations sg
                    LEFT JOIN Users u ON sg.GeneratedById = u.Id
                    WHERE (sg.StartDate <= @EndDate AND sg.EndDate >= @StartDate)
                    ORDER BY sg.CreatedAt DESC";

                var generationDict = new Dictionary<int, ScheduleGeneration>();

                var result = await connection.QueryAsync<ScheduleGeneration, User, ScheduleGeneration>(
                    query,
                    (generation, user) =>
                    {
                        if (!generationDict.TryGetValue(generation.Id, out var existingGeneration))
                        {
                            existingGeneration = generation;
                            existingGeneration.GeneratedBy = user;
                            generationDict.Add(existingGeneration.Id, existingGeneration);
                        }

                        return existingGeneration;
                    },
                    new { StartDate = startDate.Date, EndDate = endDate.Date },
                    splitOn: "Id"
                );

                return generationDict.Values;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nel recupero delle generazioni di planning dal {startDate:yyyy-MM-dd} al {endDate:yyyy-MM-dd}");
                throw;
            }
        }

        /// <summary>
        /// Ottiene l'ultima generazione di planning per un tipo di staff
        /// </summary>
        public async Task<ScheduleGeneration?> GetLatestByStaffTypeAsync(string staffType)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    SELECT TOP 1 sg.*, u.*
                    FROM ScheduleGenerations sg
                    LEFT JOIN Users u ON sg.GeneratedById = u.Id
                    WHERE sg.StaffType = @StaffType
                    ORDER BY sg.CreatedAt DESC";

                var generationDict = new Dictionary<int, ScheduleGeneration>();

                var result = await connection.QueryAsync<ScheduleGeneration, User, ScheduleGeneration>(
                    query,
                    (generation, user) =>
                    {
                        if (!generationDict.TryGetValue(generation.Id, out var existingGeneration))
                        {
                            existingGeneration = generation;
                            existingGeneration.GeneratedBy = user;
                            generationDict.Add(existingGeneration.Id, existingGeneration);
                        }

                        return existingGeneration;
                    },
                    new { StaffType = staffType },
                    splitOn: "Id"
                );

                return result.FirstOrDefault();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nel recupero dell'ultima generazione di planning per il tipo di staff {staffType}");
                throw;
            }
        }

        /// <summary>
        /// Elimina una generazione di planning
        /// </summary>
        public async Task<bool> DeleteAsync(int id)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = "DELETE FROM ScheduleGenerations WHERE Id = @Id";

                var affectedRows = await connection.ExecuteAsync(query, new { Id = id });
                return affectedRows > 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nell'eliminazione della generazione di planning con ID {id}");
                throw;
            }
        }
    }

    public interface IScheduleGenerationRepository
    {
        Task<ScheduleGeneration?> GetByIdAsync(int id);
        Task<ScheduleGeneration> CreateAsync(ScheduleGeneration scheduleGeneration);
        Task<IEnumerable<ScheduleGeneration>> GetAllAsync();
        Task<IEnumerable<ScheduleGeneration>> GetByStaffTypeAsync(string staffType);
        Task<IEnumerable<ScheduleGeneration>> GetByDateRangeAsync(DateTime startDate, DateTime endDate);
        Task<ScheduleGeneration?> GetLatestByStaffTypeAsync(string staffType);
        Task<bool> DeleteAsync(int id);
    }
}
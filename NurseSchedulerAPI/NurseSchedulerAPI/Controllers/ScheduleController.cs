using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NurseSchedulerAPI.Models;
using NurseSchedulerAPI.Repositories;
using NurseSchedulerAPI.Services;
using System.Security.Claims;

namespace NurseSchedulerAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ScheduleController : ControllerBase
    {
        private readonly IShiftRepository _shiftRepository;
        private readonly IVacationRepository _vacationRepository;
        private readonly IScheduleGenerationRepository _scheduleGenerationRepository;
        private readonly IStaffRepository _staffRepository;
        private readonly SchedulerService _schedulerService;
        private readonly NotificationService _notificationService;
        private readonly ILogger<ScheduleController> _logger;

        public ScheduleController(
            IShiftRepository shiftRepository,
            IVacationRepository vacationRepository,
            IScheduleGenerationRepository scheduleGenerationRepository,
            IStaffRepository staffRepository,
            SchedulerService schedulerService,
            NotificationService notificationService,
            ILogger<ScheduleController> logger)
        {
            _shiftRepository = shiftRepository;
            _vacationRepository = vacationRepository;
            _scheduleGenerationRepository = scheduleGenerationRepository;
            _staffRepository = staffRepository;
            _schedulerService = schedulerService;
            _notificationService = notificationService;
            _logger = logger;
        }

        /// <summary>
        /// Genera un nuovo planning
        /// </summary>
        [HttpPost("generate")]
        [Authorize(Roles = "HeadNurse")]
        public async Task<ActionResult<ScheduleGenerationResult>> GenerateSchedule(GenerateScheduleRequest request)
        {
            try
            {
                // Valida la richiesta
                if (request.StartDate >= request.EndDate)
                {
                    return BadRequest(new { message = "La data di inizio deve essere anteriore alla data di fine" });
                }

                // Calcola la durata del periodo
                var duration = (request.EndDate - request.StartDate).Days + 1;
                if (duration > 31) // Limita a un mese
                {
                    return BadRequest(new { message = "Il periodo non può superare i 31 giorni" });
                }

                // Ottieni l'ID dell'utente corrente
                int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");

                // Genera il planning
                var result = await _schedulerService.GenerateScheduleAsync(
                    request.StartDate,
                    request.EndDate,
                    request.StaffType,
                    userId,
                    request.Parameters
                );

                if (result.Success)
                {
                    // Invia notifiche agli utenti interessati
                    await _notificationService.NotifyNewScheduleAsync(
                        request.StartDate,
                        request.EndDate,
                        request.StaffType
                    );
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Errore nella generazione del planning");
                return StatusCode(500, new { message = $"Errore nella generazione del planning: {ex.Message}" });
            }
        }

        /// <summary>
        /// Ottiene i turni per un intervallo di date
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Shift>>> GetShifts([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
        {
            try
            {
                // Se le date non sono specificate, usa il mese corrente
                var start = startDate ?? new DateTime(DateTime.Now.Year, DateTime.Now.Month, 1);
                var end = endDate ?? start.AddMonths(1).AddDays(-1);

                // Valida le date
                if (start > end)
                {
                    return BadRequest(new { message = "La data di inizio deve essere anteriore alla data di fine" });
                }

                // Ottieni i turni
                var shifts = await _shiftRepository.GetByDateRangeAsync(start, end);
                return Ok(shifts);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Errore nel recupero dei turni");
                return StatusCode(500, new { message = $"Errore nel recupero dei turni: {ex.Message}" });
            }
        }

        /// <summary>
        /// Ottiene i turni di un membro dello staff per un intervallo di date
        /// </summary>
        [HttpGet("staff/{staffId}")]
        public async Task<ActionResult<IEnumerable<Shift>>> GetStaffShifts(
            int staffId,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            try
            {
                // Se le date non sono specificate, usa il mese corrente
                var start = startDate ?? new DateTime(DateTime.Now.Year, DateTime.Now.Month, 1);
                var end = endDate ?? start.AddMonths(1).AddDays(-1);

                // Valida le date
                if (start > end)
                {
                    return BadRequest(new { message = "La data di inizio deve essere anteriore alla data di fine" });
                }

                // Ottieni i turni
                var shifts = await _shiftRepository.GetByStaffIdAndDateRangeAsync(staffId, start, end);
                return Ok(shifts);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nel recupero dei turni per lo staff {staffId}");
                return StatusCode(500, new { message = $"Errore nel recupero dei turni: {ex.Message}" });
            }
        }

        /// <summary>
        /// Ottiene i turni dell'utente corrente per un intervallo di date
        /// </summary>
        [HttpGet("my")]
        public async Task<ActionResult<IEnumerable<Shift>>> GetMyShifts(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            try
            {
                // Ottieni l'ID dell'utente corrente
                int userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");

                // Ottieni lo staff associato all'utente
                var staff = await _staffRepository.GetByUserIdAsync(userId);
                if (staff == null)
                {
                    return NotFound(new { message = "Nessun membro dello staff associato all'utente corrente" });
                }

                // Se le date non sono specificate, usa il mese corrente
                var start = startDate ?? new DateTime(DateTime.Now.Year, DateTime.Now.Month, 1);
                var end = endDate ?? start.AddMonths(1).AddDays(-1);

                // Valida le date
                if (start > end)
                {
                    return BadRequest(new { message = "La data di inizio deve essere anteriore alla data di fine" });
                }

                // Ottieni i turni
                var shifts = await _shiftRepository.GetByStaffIdAndDateRangeAsync(staff.Id, start, end);
                return Ok(shifts);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Errore nel recupero dei turni per l'utente corrente");
                return StatusCode(500, new { message = $"Errore nel recupero dei turni: {ex.Message}" });
            }
        }

        /// <summary>
        /// Aggiorna un turno
        /// </summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "HeadNurse")]
        public async Task<ActionResult<Shift>> UpdateShift(int id, UpdateShiftRequest request)
        {
            try
            {
                // Ottieni il turno esistente
                var existingShift = await _shiftRepository.GetByIdAsync(id);
                if (existingShift == null)
                {
                    return NotFound(new { message = $"Turno con ID {id} non trovato" });
                }

                // Aggiorna il turno
                existingShift.ShiftType = request.ShiftType;
                existingShift.Notes = request.Notes;
                existingShift.UpdatedAt = DateTime.UtcNow;

                // Salva le modifiche
                var updatedShift = await _shiftRepository.UpdateAsync(id, existingShift);
                return Ok(updatedShift);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nell'aggiornamento del turno con ID {id}");
                return StatusCode(500, new { message = $"Errore nell'aggiornamento del turno: {ex.Message}" });
            }
        }

        /// <summary>
        /// Elimina un turno
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "HeadNurse")]
        public async Task<IActionResult> DeleteShift(int id)
        {
            try
            {
                // Ottieni il turno esistente
                var existingShift = await _shiftRepository.GetByIdAsync(id);
                if (existingShift == null)
                {
                    return NotFound(new { message = $"Turno con ID {id} non trovato" });
                }

                // Elimina il turno
                var result = await _shiftRepository.DeleteAsync(id);
                if (result)
                {
                    return NoContent();
                }
                else
                {
                    return StatusCode(500, new { message = "Impossibile eliminare il turno" });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nell'eliminazione del turno con ID {id}");
                return StatusCode(500, new { message = $"Errore nell'eliminazione del turno: {ex.Message}" });
            }
        }

        /// <summary>
        /// Elimina tutti i turni in un intervallo di date
        /// </summary>
        [HttpDelete]
        [Authorize(Roles = "HeadNurse")]
        public async Task<IActionResult> DeleteShiftsByDateRange([FromQuery] DateTime startDate, [FromQuery] DateTime endDate)
        {
            try
            {
                // Valida le date
                if (startDate > endDate)
                {
                    return BadRequest(new { message = "La data di inizio deve essere anteriore alla data di fine" });
                }

                // Elimina i turni
                var count = await _shiftRepository.DeleteByDateRangeAsync(startDate, endDate);
                return Ok(new { message = $"Eliminati {count} turni", deletedCount = count });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nell'eliminazione dei turni dal {startDate:yyyy-MM-dd} al {endDate:yyyy-MM-dd}");
                return StatusCode(500, new { message = $"Errore nell'eliminazione dei turni: {ex.Message}" });
            }
        }

        /// <summary>
        /// Ottiene le generazioni di planning
        /// </summary>
        [HttpGet("generations")]
        [Authorize(Roles = "HeadNurse")]
        public async Task<ActionResult<IEnumerable<ScheduleGeneration>>> GetScheduleGenerations(
            [FromQuery] string? staffType = null)
        {
            try
            {
                IEnumerable<ScheduleGeneration> generations;
                if (string.IsNullOrEmpty(staffType))
                {
                    generations = await _scheduleGenerationRepository.GetAllAsync();
                }
                else
                {
                    generations = await _scheduleGenerationRepository.GetByStaffTypeAsync(staffType);
                }

                return Ok(generations);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Errore nel recupero delle generazioni di planning");
                return StatusCode(500, new { message = $"Errore nel recupero delle generazioni di planning: {ex.Message}" });
            }
        }

        /// <summary>
        /// Ottiene le statistiche di qualità del planning
        /// </summary>
        [HttpGet("quality")]
        [Authorize(Roles = "HeadNurse")]
        public async Task<ActionResult<ScheduleQualityMetrics>> GetScheduleQualityMetrics(
            [FromQuery] DateTime startDate,
            [FromQuery] DateTime endDate,
            [FromQuery] string staffType)
        {
            try
            {
                // Valida le date
                if (startDate > endDate)
                {
                    return BadRequest(new { message = "La data di inizio deve essere anteriore alla data di fine" });
                }

                // Ottieni i turni per il periodo specificato
                var shifts = await _shiftRepository.GetByDateRangeAsync(startDate, endDate);
                
                // Ottieni i membri dello staff del tipo specificato
                var staffMembers = await _staffRepository.GetByRoleAsync(staffType);
                
                // Filtra i turni per il tipo di staff specificato
                var staffIds = staffMembers.Select(s => s.Id).ToList();
                var filteredShifts = shifts.Where(s => staffIds.Contains(s.StaffId)).ToList();
                
                // Se non ci sono turni, restituisci metriche vuote
                if (!filteredShifts.Any())
                {
                    return Ok(new ScheduleQualityMetrics());
                }
                
                // Calcola le metriche
                var metrics = new ScheduleQualityMetrics
                {
                    TotalMorningShifts = filteredShifts.Count(s => s.ShiftType == "M"),
                    TotalAfternoonShifts = filteredShifts.Count(s => s.ShiftType == "P"),
                    TotalNightShifts = filteredShifts.Count(s => s.ShiftType == "N"),
                    TotalRestDays = filteredShifts.Count(s => s.ShiftType == "R"),
                    TotalVacationDays = filteredShifts.Count(s => s.ShiftType == "F")
                };
                
                // Calcola il carico di lavoro per membro dello staff
                var workloadByStaff = new Dictionary<int, int>();
                foreach (var staff in staffMembers)
                {
                    var staffShifts = filteredShifts.Where(s => s.StaffId == staff.Id).ToList();
                    var workShifts = staffShifts.Count(s => s.ShiftType != "R" && s.ShiftType != "F");
                    workloadByStaff[staff.Id] = workShifts;
                }
                
                metrics.MinWorkload = workloadByStaff.Values.Any() ? workloadByStaff.Values.Min() : 0;
                metrics.MaxWorkload = workloadByStaff.Values.Any() ? workloadByStaff.Values.Max() : 0;
                metrics.AvgWorkload = workloadByStaff.Values.Any() ? workloadByStaff.Values.Average() : 0;
                
                // Calcola le statistiche sui weekend
                var weekendWorkByStaff = new Dictionary<int, int>();
                foreach (var staff in staffMembers)
                {
                    weekendWorkByStaff[staff.Id] = 0;
                }
                
                for (DateTime day = startDate; day <= endDate; day = day.AddDays(1))
                {
                    if (day.DayOfWeek == DayOfWeek.Saturday || day.DayOfWeek == DayOfWeek.Sunday)
                    {
                        foreach (var shift in filteredShifts.Where(s => s.Date.Date == day.Date))
                        {
                            if (shift.ShiftType != "R" && shift.ShiftType != "F")
                            {
                                weekendWorkByStaff[shift.StaffId]++;
                            }
                        }
                    }
                }
                
                metrics.MinWeekendWorkdays = weekendWorkByStaff.Values.Any() ? weekendWorkByStaff.Values.Min() : 0;
                metrics.MaxWeekendWorkdays = weekendWorkByStaff.Values.Any() ? weekendWorkByStaff.Values.Max() : 0;
                metrics.AvgWeekendWorkdays = weekendWorkByStaff.Values.Any() ? weekendWorkByStaff.Values.Average() : 0;
                
                // Calcola il numero di violazioni di sequenza N -> M
                int nightToMorningViolations = 0;
                foreach (var staff in staffMembers)
                {
                    var staffShifts = filteredShifts
                        .Where(s => s.StaffId == staff.Id)
                        .OrderBy(s => s.Date)
                        .ToList();
                    
                    for (int i = 1; i < staffShifts.Count; i++)
                    {
                        if (staffShifts[i - 1].ShiftType == "N" && 
                            staffShifts[i].ShiftType == "M" && 
                            staffShifts[i].Date == staffShifts[i - 1].Date.AddDays(1))
                        {
                            nightToMorningViolations++;
                        }
                    }
                }
                
                metrics.NightToMorningViolations = nightToMorningViolations;
                
                // Calcola un punteggio complessivo (su 100)
                double workloadBalanceScore = 30.0;
                if (metrics.AvgWorkload > 0)
                {
                    workloadBalanceScore = 30.0 * (1.0 - (metrics.MaxWorkload - metrics.MinWorkload) / metrics.AvgWorkload);
                }
                
                double weekendBalanceScore = 25.0;
                if (metrics.AvgWeekendWorkdays > 0)
                {
                    weekendBalanceScore = 25.0 * (1.0 - (metrics.MaxWeekendWorkdays - metrics.MinWeekendWorkdays) / Math.Max(1.0, metrics.AvgWeekendWorkdays));
                }
                
                double nightToMorningScore = 20.0 * (1.0 - Math.Min(1.0, (double)nightToMorningViolations / Math.Max(1, staffMembers.Count())));
                double shiftDistributionScore = 25.0; // Punteggio base
                
                // Calcola il punteggio complessivo
                metrics.OverallQualityScore = workloadBalanceScore + weekendBalanceScore + nightToMorningScore + shiftDistributionScore;
                metrics.OverallQualityScore = Math.Max(0.0, Math.Min(100.0, metrics.OverallQualityScore));
                
                return Ok(metrics);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Errore nel calcolo delle metriche di qualità del planning");
                return StatusCode(500, new { message = $"Errore nel calcolo delle metriche: {ex.Message}" });
            }
        }
    }

    public class GenerateScheduleRequest
    {
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string StaffType { get; set; } = "";
        public Dictionary<string, object>? Parameters { get; set; }
    }

    public class UpdateShiftRequest
    {
        public string ShiftType { get; set; } = "";
        public string? Notes { get; set; }
    }
}
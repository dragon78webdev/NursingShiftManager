using Microsoft.EntityFrameworkCore;
using NurseSchedulerAPI.Data;
using NurseSchedulerAPI.Models;
using System.Text.Json;

namespace NurseSchedulerAPI.Services
{
    public class SchedulerService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<SchedulerService> _logger;

        public SchedulerService(
            ApplicationDbContext context,
            ILogger<SchedulerService> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Genera un nuovo schedule per un intervallo di date e un tipo di personale
        /// </summary>
        public async Task<(List<Shift> Shifts, ScheduleGeneration Generation)> GenerateScheduleAsync(
            DateTime startDate, 
            DateTime endDate, 
            Role staffType, 
            int generatedById,
            Dictionary<string, object>? optimizationParams = null)
        {
            try
            {
                // Registra l'inizio della generazione
                var startTime = DateTime.UtcNow;
                
                // Recupera il personale del tipo richiesto
                var staffList = await _context.Staff
                    .Where(s => s.Role == staffType && s.User != null && s.User.IsActive)
                    .ToListAsync();
                
                if (!staffList.Any())
                {
                    throw new InvalidOperationException($"Nessun personale di tipo {staffType} disponibile");
                }
                
                // Recupera le ferie nel periodo selezionato
                var vacations = await _context.Vacations
                    .Where(v => v.Approved == true &&
                           ((v.StartDate <= endDate && v.EndDate >= startDate) ||
                           (v.StartDate >= startDate && v.StartDate <= endDate) ||
                           (v.EndDate >= startDate && v.EndDate <= endDate)))
                    .ToListAsync();
                
                // Genera i turni
                var shifts = await GenerateOptimizedShiftsAsync(staffList, vacations, startDate, endDate, optimizationParams);
                
                // Registra la fine della generazione
                var endTime = DateTime.UtcNow;
                var generationTime = (endTime - startTime).TotalSeconds;
                
                // Crea una registrazione della generazione
                var scheduleGeneration = new ScheduleGeneration
                {
                    GeneratedById = generatedById,
                    StartDate = startDate,
                    EndDate = endDate,
                    StaffType = staffType,
                    OptimizationParameters = optimizationParams != null ? JsonSerializer.Serialize(optimizationParams) : null,
                    QualityScore = CalculateScheduleQuality(shifts, staffList, vacations),
                    GenerationTime = generationTime,
                    CreatedAt = DateTime.UtcNow
                };
                
                _context.ScheduleGenerations.Add(scheduleGeneration);
                await _context.SaveChangesAsync();
                
                return (shifts, scheduleGeneration);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Errore durante la generazione dei turni");
                throw;
            }
        }
        
        /// <summary>
        /// Genera i turni ottimizzati basati sui parametri forniti
        /// </summary>
        private async Task<List<Shift>> GenerateOptimizedShiftsAsync(
            List<Staff> staffList, 
            List<Vacation> vacations, 
            DateTime startDate,
            DateTime endDate, 
            Dictionary<string, object>? optimizationParams = null)
        {
            // Qui implementeremo la logica dell'algoritmo di ottimizzazione
            var shifts = new List<Shift>();
            var random = new Random();
            
            // Ottieni le preferenze di default dai parametri di ottimizzazione
            bool balanceWorkload = true;
            bool respectSeniority = false;
            bool optimizeWeekends = true;
            bool avoidNightAfterMorning = true;
            bool avoidIsolatedWorkDays = true;
            int minConsecutiveRestDays = 2;
            int maxConsecutiveWorkDays = 5;
            
            if (optimizationParams != null)
            {
                if (optimizationParams.TryGetValue("balanceWorkload", out var balanceWorkloadObj))
                    balanceWorkload = Convert.ToBoolean(balanceWorkloadObj);
                
                if (optimizationParams.TryGetValue("respectSeniority", out var respectSeniorityObj))
                    respectSeniority = Convert.ToBoolean(respectSeniorityObj);
                
                if (optimizationParams.TryGetValue("optimizeWeekends", out var optimizeWeekendsObj))
                    optimizeWeekends = Convert.ToBoolean(optimizeWeekendsObj);
                
                if (optimizationParams.TryGetValue("avoidNightAfterMorning", out var avoidNightAfterMorningObj))
                    avoidNightAfterMorning = Convert.ToBoolean(avoidNightAfterMorningObj);
                
                if (optimizationParams.TryGetValue("avoidIsolatedWorkDays", out var avoidIsolatedWorkDaysObj))
                    avoidIsolatedWorkDays = Convert.ToBoolean(avoidIsolatedWorkDaysObj);
                
                if (optimizationParams.TryGetValue("minConsecutiveRestDays", out var minConsecutiveRestDaysObj))
                    minConsecutiveRestDays = Convert.ToInt32(minConsecutiveRestDaysObj);
                
                if (optimizationParams.TryGetValue("maxConsecutiveWorkDays", out var maxConsecutiveWorkDaysObj))
                    maxConsecutiveWorkDays = Convert.ToInt32(maxConsecutiveWorkDaysObj);
            }
            
            // Crea un dizionario di personale in ferie per data
            var staffOnVacation = new Dictionary<DateTime, HashSet<int>>();
            for (var day = startDate; day <= endDate; day = day.AddDays(1))
            {
                staffOnVacation[day] = new HashSet<int>();
            }
            
            foreach (var vacation in vacations)
            {
                for (var day = vacation.StartDate; day <= vacation.EndDate; day = day.AddDays(1))
                {
                    if (day >= startDate && day <= endDate)
                    {
                        staffOnVacation[day].Add(vacation.StaffId);
                    }
                }
            }
            
            // Crea strutture dati per l'algoritmo
            var staffShifts = new Dictionary<int, Dictionary<DateTime, ShiftType>>();
            var shiftCounts = new Dictionary<int, Dictionary<ShiftType, int>>();
            var consecutiveWorkDays = new Dictionary<int, int>();
            var lastShiftType = new Dictionary<int, ShiftType>();
            
            foreach (var staff in staffList)
            {
                staffShifts[staff.Id] = new Dictionary<DateTime, ShiftType>();
                shiftCounts[staff.Id] = new Dictionary<ShiftType, int>
                {
                    { ShiftType.Morning, 0 },
                    { ShiftType.Afternoon, 0 },
                    { ShiftType.Night, 0 },
                    { ShiftType.Rest, 0 },
                    { ShiftType.Vacation, 0 }
                };
                consecutiveWorkDays[staff.Id] = 0;
                lastShiftType[staff.Id] = ShiftType.Rest;
            }
            
            // Per ogni giorno nel range
            for (var day = startDate; day <= endDate; day = day.AddDays(1))
            {
                // Definiamo il numero di personale richiesto per ogni turno
                int morningStaffRequired = (int)Math.Ceiling(staffList.Count * 0.4);
                int afternoonStaffRequired = (int)Math.Ceiling(staffList.Count * 0.3);
                int nightStaffRequired = (int)Math.Ceiling(staffList.Count * 0.2);
                
                var morningStaff = new List<Staff>();
                var afternoonStaff = new List<Staff>();
                var nightStaff = new List<Staff>();
                var restStaff = new List<Staff>();
                
                // Ordiniamo il personale in base ai parametri di ottimizzazione
                var availableStaff = staffList
                    .Where(s => !staffOnVacation[day].Contains(s.Id))
                    .ToList();
                
                if (balanceWorkload)
                {
                    // Ordina il personale in base al numero di turni assegnati
                    availableStaff = availableStaff
                        .OrderBy(s => shiftCounts[s.Id][ShiftType.Morning] + 
                                 shiftCounts[s.Id][ShiftType.Afternoon] + 
                                 shiftCounts[s.Id][ShiftType.Night])
                        .ToList();
                }
                
                if (respectSeniority)
                {
                    // Personale con più esperienza ha priorità per turni migliori
                    availableStaff = availableStaff
                        .OrderByDescending(s => s.YearsOfExperience)
                        .ToList();
                }
                
                // Assegnazione dei turni per questo giorno
                foreach (var staff in availableStaff)
                {
                    // Check per vacanze
                    if (staffOnVacation[day].Contains(staff.Id))
                    {
                        staffShifts[staff.Id][day] = ShiftType.Vacation;
                        shiftCounts[staff.Id][ShiftType.Vacation]++;
                        consecutiveWorkDays[staff.Id] = 0;
                        lastShiftType[staff.Id] = ShiftType.Vacation;
                        
                        shifts.Add(new Shift
                        {
                            StaffId = staff.Id,
                            Date = day,
                            ShiftType = ShiftType.Vacation,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        });
                        
                        continue;
                    }
                    
                    // Check per giorni consecutivi di lavoro
                    if (consecutiveWorkDays[staff.Id] >= maxConsecutiveWorkDays)
                    {
                        restStaff.Add(staff);
                        continue;
                    }
                    
                    // Check per evitare turno di notte dopo turno di mattina
                    if (avoidNightAfterMorning && lastShiftType[staff.Id] == ShiftType.Morning)
                    {
                        // Non assegnare turno di notte
                        if (morningStaff.Count < morningStaffRequired)
                        {
                            morningStaff.Add(staff);
                        }
                        else if (afternoonStaff.Count < afternoonStaffRequired)
                        {
                            afternoonStaff.Add(staff);
                        }
                        else
                        {
                            restStaff.Add(staff);
                        }
                        continue;
                    }
                    
                    // Assegnazione bilanciata dei turni
                    var shiftTypeToAssign = ShiftType.Rest;
                    
                    if (morningStaff.Count < morningStaffRequired)
                    {
                        shiftTypeToAssign = ShiftType.Morning;
                        morningStaff.Add(staff);
                    }
                    else if (afternoonStaff.Count < afternoonStaffRequired)
                    {
                        shiftTypeToAssign = ShiftType.Afternoon;
                        afternoonStaff.Add(staff);
                    }
                    else if (nightStaff.Count < nightStaffRequired)
                    {
                        shiftTypeToAssign = ShiftType.Night;
                        nightStaff.Add(staff);
                    }
                    else
                    {
                        restStaff.Add(staff);
                    }
                    
                    staffShifts[staff.Id][day] = shiftTypeToAssign;
                    shiftCounts[staff.Id][shiftTypeToAssign]++;
                    
                    if (shiftTypeToAssign != ShiftType.Rest && shiftTypeToAssign != ShiftType.Vacation)
                    {
                        consecutiveWorkDays[staff.Id]++;
                    }
                    else
                    {
                        consecutiveWorkDays[staff.Id] = 0;
                    }
                    
                    lastShiftType[staff.Id] = shiftTypeToAssign;
                    
                    shifts.Add(new Shift
                    {
                        StaffId = staff.Id,
                        Date = day,
                        ShiftType = shiftTypeToAssign,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                }
                
                // Assegna turni di riposo al personale rimanente
                foreach (var staff in restStaff)
                {
                    staffShifts[staff.Id][day] = ShiftType.Rest;
                    shiftCounts[staff.Id][ShiftType.Rest]++;
                    consecutiveWorkDays[staff.Id] = 0;
                    lastShiftType[staff.Id] = ShiftType.Rest;
                    
                    shifts.Add(new Shift
                    {
                        StaffId = staff.Id,
                        Date = day,
                        ShiftType = ShiftType.Rest,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                }
                
                // Personale in vacanza
                foreach (var staffId in staffOnVacation[day])
                {
                    if (!staffShifts.ContainsKey(staffId) || staffShifts[staffId].ContainsKey(day))
                        continue;
                    
                    staffShifts[staffId][day] = ShiftType.Vacation;
                    shiftCounts[staffId][ShiftType.Vacation]++;
                    consecutiveWorkDays[staffId] = 0;
                    lastShiftType[staffId] = ShiftType.Vacation;
                    
                    shifts.Add(new Shift
                    {
                        StaffId = staffId,
                        Date = day,
                        ShiftType = ShiftType.Vacation,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                }
            }
            
            return shifts;
        }
        
        /// <summary>
        /// Calcola un punteggio di qualità per lo schedule generato
        /// </summary>
        private double CalculateScheduleQuality(List<Shift> shifts, List<Staff> staffList, List<Vacation> vacations)
        {
            // Qui implementeremo la logica per il calcolo della qualità dello schedule
            // Punteggio da 0 a 10
            
            double score = 8.0;  // Punteggio base
            
            // Calcolo della distribuzione dei turni per membro del personale
            var shiftDistribution = new Dictionary<int, Dictionary<ShiftType, int>>();
            foreach (var staff in staffList)
            {
                shiftDistribution[staff.Id] = new Dictionary<ShiftType, int>
                {
                    { ShiftType.Morning, 0 },
                    { ShiftType.Afternoon, 0 },
                    { ShiftType.Night, 0 },
                    { ShiftType.Rest, 0 },
                    { ShiftType.Vacation, 0 }
                };
            }
            
            foreach (var shift in shifts)
            {
                if (shiftDistribution.ContainsKey(shift.StaffId))
                {
                    shiftDistribution[shift.StaffId][shift.ShiftType]++;
                }
            }
            
            // Calcola la deviazione standard della distribuzione dei turni
            double meanShifts = shifts.Count / (double)staffList.Count;
            double varianceSum = 0;
            
            foreach (var staffShifts in shiftDistribution.Values)
            {
                int workShifts = staffShifts[ShiftType.Morning] + staffShifts[ShiftType.Afternoon] + staffShifts[ShiftType.Night];
                double diff = workShifts - meanShifts;
                varianceSum += diff * diff;
            }
            
            double stdDev = Math.Sqrt(varianceSum / staffList.Count);
            
            // Penalità per alta deviazione standard (indica distribuzione non bilanciata)
            if (stdDev > 2.0)
            {
                score -= (stdDev - 2.0) / 2.0;
            }
            
            // Verifica eventuali violazioni di vincoli (es. turni consecutivi)
            var consecutiveShifts = new Dictionary<int, int>();
            var lastShiftDate = new Dictionary<int, DateTime>();
            var lastShiftType = new Dictionary<int, ShiftType>();
            
            foreach (var staff in staffList)
            {
                consecutiveShifts[staff.Id] = 0;
                lastShiftDate[staff.Id] = DateTime.MinValue;
                lastShiftType[staff.Id] = ShiftType.Rest;
            }
            
            foreach (var shift in shifts.OrderBy(s => s.Date))
            {
                if (!consecutiveShifts.ContainsKey(shift.StaffId))
                    continue;
                
                // Verifica turni consecutivi
                if (lastShiftDate[shift.StaffId] != DateTime.MinValue &&
                    (shift.Date - lastShiftDate[shift.StaffId]).Days == 1)
                {
                    if (shift.ShiftType != ShiftType.Rest && shift.ShiftType != ShiftType.Vacation)
                    {
                        consecutiveShifts[shift.StaffId]++;
                    }
                    else
                    {
                        consecutiveShifts[shift.StaffId] = 0;
                    }
                }
                else
                {
                    consecutiveShifts[shift.StaffId] = 1;
                }
                
                // Penalità per turno di notte dopo turno di mattina
                if (lastShiftType[shift.StaffId] == ShiftType.Morning && shift.ShiftType == ShiftType.Night)
                {
                    score -= 0.5;
                }
                
                // Penalità per troppi turni consecutivi
                if (consecutiveShifts[shift.StaffId] > 5)
                {
                    score -= 0.3;
                }
                
                lastShiftDate[shift.StaffId] = shift.Date;
                lastShiftType[shift.StaffId] = shift.ShiftType;
            }
            
            // Assicurati che il punteggio sia nel range 0-10
            score = Math.Max(0, Math.Min(10, score));
            
            return score;
        }
        
        /// <summary>
        /// Ottimizza un schedule esistente
        /// </summary>
        public async Task<List<Shift>> OptimizeExistingScheduleAsync(
            List<Shift> existingShifts,
            DateTime startDate,
            DateTime endDate,
            Dictionary<string, object>? optimizationParams = null)
        {
            try
            {
                // Recupera il personale coinvolto negli shift esistenti
                var staffIds = existingShifts.Select(s => s.StaffId).Distinct().ToList();
                var staffList = await _context.Staff
                    .Where(s => staffIds.Contains(s.Id))
                    .ToListAsync();
                
                // Recupera le ferie nel periodo selezionato
                var vacations = await _context.Vacations
                    .Where(v => v.Approved == true && staffIds.Contains(v.StaffId) &&
                           ((v.StartDate <= endDate && v.EndDate >= startDate) ||
                           (v.StartDate >= startDate && v.StartDate <= endDate) ||
                           (v.EndDate >= startDate && v.EndDate <= endDate)))
                    .ToListAsync();
                
                // Mantiene le informazioni sullo schedule corrente
                var currentSchedule = existingShifts
                    .ToDictionary(
                        s => (s.StaffId, s.Date),
                        s => s
                    );
                
                // Implementa l'algoritmo di ottimizzazione qui
                // Per ora, usiamo una versione semplificata che migliora alcuni aspetti
                
                var optimizedShifts = new List<Shift>();
                
                // Ottimizzazione: scambia turni per migliorare la distribuzione
                foreach (var shift in existingShifts)
                {
                    // Copia lo shift originale
                    var optimizedShift = new Shift
                    {
                        Id = shift.Id,
                        StaffId = shift.StaffId,
                        Date = shift.Date,
                        ShiftType = shift.ShiftType,
                        IsManuallyAssigned = shift.IsManuallyAssigned,
                        Notes = shift.Notes,
                        CreatedAt = shift.CreatedAt,
                        UpdatedAt = DateTime.UtcNow
                    };
                    
                    optimizedShifts.Add(optimizedShift);
                }
                
                // Esegui ottimizzazioni
                if (optimizationParams != null)
                {
                    bool avoidNightAfterMorning = true;
                    bool balanceWorkload = true;
                    bool optimizeWeekends = true;
                    
                    if (optimizationParams.TryGetValue("avoidNightAfterMorning", out var avoidNightAfterMorningObj))
                        avoidNightAfterMorning = Convert.ToBoolean(avoidNightAfterMorningObj);
                    
                    if (optimizationParams.TryGetValue("balanceWorkload", out var balanceWorkloadObj))
                        balanceWorkload = Convert.ToBoolean(balanceWorkloadObj);
                    
                    if (optimizationParams.TryGetValue("optimizeWeekends", out var optimizeWeekendsObj))
                        optimizeWeekends = Convert.ToBoolean(optimizeWeekendsObj);
                    
                    // Applicazione delle ottimizzazioni
                    if (avoidNightAfterMorning)
                    {
                        ApplyAvoidNightAfterMorningOptimization(optimizedShifts);
                    }
                    
                    if (balanceWorkload)
                    {
                        ApplyBalanceWorkloadOptimization(optimizedShifts, staffList);
                    }
                    
                    if (optimizeWeekends)
                    {
                        ApplyWeekendOptimization(optimizedShifts, startDate, endDate);
                    }
                }
                
                return optimizedShifts;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Errore durante l'ottimizzazione dei turni");
                throw;
            }
        }
        
        // Metodi di ottimizzazione
        
        private void ApplyAvoidNightAfterMorningOptimization(List<Shift> shifts)
        {
            // Ordina gli shift per staffer e data
            shifts = shifts.OrderBy(s => s.StaffId).ThenBy(s => s.Date).ToList();
            
            // Per ogni staffer
            foreach (var stafferId in shifts.Select(s => s.StaffId).Distinct())
            {
                var stafferShifts = shifts.Where(s => s.StaffId == stafferId).OrderBy(s => s.Date).ToList();
                
                for (int i = 0; i < stafferShifts.Count - 1; i++)
                {
                    var currentShift = stafferShifts[i];
                    var nextShift = stafferShifts[i + 1];
                    
                    // Se c'è un turno di mattina seguito da un turno di notte il giorno dopo
                    if (currentShift.ShiftType == ShiftType.Morning && 
                        nextShift.ShiftType == ShiftType.Night &&
                        (nextShift.Date - currentShift.Date).Days == 1)
                    {
                        // Cerca uno staffer a cui scambiare il turno
                        var candidateShifts = shifts
                            .Where(s => s.Date == nextShift.Date && 
                                   s.StaffId != stafferId && 
                                   s.ShiftType == ShiftType.Afternoon)
                            .ToList();
                        
                        if (candidateShifts.Any())
                        {
                            var shiftToSwap = candidateShifts.First();
                            
                            // Scambia i tipi di turno
                            (nextShift.ShiftType, shiftToSwap.ShiftType) = (shiftToSwap.ShiftType, nextShift.ShiftType);
                        }
                    }
                }
            }
        }
        
        private void ApplyBalanceWorkloadOptimization(List<Shift> shifts, List<Staff> staffList)
        {
            // Calcola il carico di lavoro attuale per ogni staffer
            var workload = new Dictionary<int, int>();
            foreach (var staff in staffList)
            {
                workload[staff.Id] = 0;
            }
            
            foreach (var shift in shifts)
            {
                if (shift.ShiftType != ShiftType.Rest && shift.ShiftType != ShiftType.Vacation)
                {
                    workload[shift.StaffId]++;
                }
            }
            
            // Identifica staffers con carico troppo alto e troppo basso
            var avgWorkload = workload.Values.Average();
            var highWorkloadStaffers = workload
                .Where(kv => kv.Value > avgWorkload + 2)
                .Select(kv => kv.Key)
                .ToList();
            
            var lowWorkloadStaffers = workload
                .Where(kv => kv.Value < avgWorkload - 2)
                .Select(kv => kv.Key)
                .ToList();
            
            // Bilancia il carico spostando turni dai più carichi ai meno carichi
            foreach (var highStafferId in highWorkloadStaffers)
            {
                foreach (var lowStafferId in lowWorkloadStaffers)
                {
                    // Cerca turni di lavoro (non riposo o vacanza) che possono essere spostati
                    var shiftsToMove = shifts
                        .Where(s => s.StaffId == highStafferId && 
                               s.ShiftType != ShiftType.Rest && 
                               s.ShiftType != ShiftType.Vacation)
                        .ToList();
                    
                    foreach (var shift in shiftsToMove)
                    {
                        // Verifica se lo staffer con basso carico è disponibile in quel giorno
                        var lowStafferShift = shifts
                            .FirstOrDefault(s => s.StaffId == lowStafferId && s.Date == shift.Date);
                        
                        if (lowStafferShift != null && lowStafferShift.ShiftType == ShiftType.Rest)
                        {
                            // Scambia i tipi di turno
                            (shift.ShiftType, lowStafferShift.ShiftType) = (lowStafferShift.ShiftType, shift.ShiftType);
                            
                            // Aggiorna i conteggi
                            workload[highStafferId]--;
                            workload[lowStafferId]++;
                            
                            // Se abbiamo bilanciato abbastanza, esci
                            if (workload[highStafferId] <= avgWorkload + 1)
                                break;
                        }
                    }
                    
                    // Se abbiamo bilanciato abbastanza, passa al prossimo staffer con alto carico
                    if (workload[highStafferId] <= avgWorkload + 1)
                        break;
                }
            }
        }
        
        private void ApplyWeekendOptimization(List<Shift> shifts, DateTime startDate, DateTime endDate)
        {
            // Identifica i weekend nel periodo
            var weekends = new List<(DateTime Saturday, DateTime Sunday)>();
            
            DateTime currentDay = startDate;
            while (currentDay <= endDate)
            {
                if (currentDay.DayOfWeek == DayOfWeek.Saturday)
                {
                    var saturday = currentDay;
                    var sunday = currentDay.AddDays(1);
                    
                    if (sunday <= endDate)
                    {
                        weekends.Add((saturday, sunday));
                    }
                }
                
                currentDay = currentDay.AddDays(1);
            }
            
            // Identifica gli staffer che lavorano in entrambi i giorni del weekend
            foreach (var weekend in weekends)
            {
                var staffWorkingBothDays = shifts
                    .Where(s => (s.Date == weekend.Saturday || s.Date == weekend.Sunday) && 
                           s.ShiftType != ShiftType.Rest && s.ShiftType != ShiftType.Vacation)
                    .GroupBy(s => s.StaffId)
                    .Where(g => g.Count() == 2)
                    .Select(g => g.Key)
                    .ToList();
                
                var staffRestingBothDays = shifts
                    .Where(s => (s.Date == weekend.Saturday || s.Date == weekend.Sunday) && 
                           (s.ShiftType == ShiftType.Rest || s.ShiftType == ShiftType.Vacation))
                    .GroupBy(s => s.StaffId)
                    .Where(g => g.Count() == 2)
                    .Select(g => g.Key)
                    .ToList();
                
                // Cerca di bilanciare il lavoro nei weekend
                foreach (var workingStafferId in staffWorkingBothDays)
                {
                    foreach (var restingStafferId in staffRestingBothDays)
                    {
                        // Scambia un giorno di lavoro con un giorno di riposo
                        var saturdayWorkingShift = shifts
                            .FirstOrDefault(s => s.StaffId == workingStafferId && s.Date == weekend.Saturday);
                        
                        var saturdayRestingShift = shifts
                            .FirstOrDefault(s => s.StaffId == restingStafferId && s.Date == weekend.Saturday);
                        
                        if (saturdayWorkingShift != null && saturdayRestingShift != null && 
                            saturdayWorkingShift.ShiftType != ShiftType.Vacation && 
                            saturdayRestingShift.ShiftType != ShiftType.Vacation)
                        {
                            // Scambia i tipi di turno
                            (saturdayWorkingShift.ShiftType, saturdayRestingShift.ShiftType) = 
                                (saturdayRestingShift.ShiftType, saturdayWorkingShift.ShiftType);
                            
                            // Esci dopo uno scambio per questo staffer
                            break;
                        }
                    }
                }
            }
        }
        
        /// <summary>
        /// Analizza la qualità di uno schedule
        /// </summary>
        public async Task<Dictionary<string, double>> AnalyzeScheduleQualityAsync(List<Shift> shifts, List<Staff> staff, List<Vacation> vacations)
        {
            try
            {
                var metrics = new Dictionary<string, double>();
                
                // Calcola varie metriche di qualità
                metrics["workloadDistribution"] = CalculateWorkloadDistribution(shifts, staff);
                metrics["consecutiveRestDays"] = CalculateConsecutiveRestDaysScore(shifts, staff);
                metrics["shiftSequence"] = CalculateShiftSequenceScore(shifts);
                metrics["weekendBalance"] = CalculateWeekendBalanceScore(shifts, staff);
                metrics["personalPreferences"] = 7.5; // Valore fisso per ora, da implementare con le preferenze reali
                metrics["nightShiftDistribution"] = CalculateNightShiftDistribution(shifts, staff);
                
                // Calcola un punteggio complessivo come media delle metriche
                double totalScore = metrics.Values.Average();
                metrics["overallScore"] = totalScore;
                
                return metrics;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Errore durante l'analisi della qualità dei turni");
                throw;
            }
        }
        
        // Metodi di calcolo delle metriche di qualità
        
        private double CalculateWorkloadDistribution(List<Shift> shifts, List<Staff> staff)
        {
            // Calcola il numero di turni di lavoro per membro dello staff
            var workShifts = new Dictionary<int, int>();
            foreach (var s in staff)
            {
                workShifts[s.Id] = 0;
            }
            
            foreach (var shift in shifts)
            {
                if (shift.ShiftType != ShiftType.Rest && shift.ShiftType != ShiftType.Vacation)
                {
                    workShifts[shift.StaffId]++;
                }
            }
            
            // Calcola la deviazione standard
            double mean = workShifts.Values.Average();
            double sumOfSquaredDifferences = workShifts.Values.Sum(count => Math.Pow(count - mean, 2));
            double stdDev = Math.Sqrt(sumOfSquaredDifferences / workShifts.Count);
            
            // Normalizza in un punteggio da 0 a 10 (minore deviazione = punteggio più alto)
            double maxAllowedStdDev = staff.Count / 2.0; // Valore arbitrario
            double score = 10 * (1 - Math.Min(1, stdDev / maxAllowedStdDev));
            
            return Math.Max(0, Math.Min(10, score));
        }
        
        private double CalculateConsecutiveRestDaysScore(List<Shift> shifts, List<Staff> staff)
        {
            double score = 10.0;
            var shiftsByStaff = shifts
                .GroupBy(s => s.StaffId)
                .ToDictionary(g => g.Key, g => g.OrderBy(s => s.Date).ToList());
            
            foreach (var staffId in staff.Select(s => s.Id))
            {
                if (!shiftsByStaff.ContainsKey(staffId))
                    continue;
                
                var staffShifts = shiftsByStaff[staffId];
                var consecutiveRest = new List<int>();
                int currentConsecutive = 0;
                
                for (int i = 0; i < staffShifts.Count; i++)
                {
                    if (staffShifts[i].ShiftType == ShiftType.Rest)
                    {
                        currentConsecutive++;
                    }
                    else
                    {
                        if (currentConsecutive > 0)
                        {
                            consecutiveRest.Add(currentConsecutive);
                            currentConsecutive = 0;
                        }
                    }
                }
                
                if (currentConsecutive > 0)
                {
                    consecutiveRest.Add(currentConsecutive);
                }
                
                // Penalità per periodi di riposo troppo brevi
                foreach (var restDays in consecutiveRest)
                {
                    if (restDays == 1)
                    {
                        score -= 0.5; // Penalità per giorno di riposo isolato
                    }
                }
            }
            
            return Math.Max(0, Math.Min(10, score));
        }
        
        private double CalculateShiftSequenceScore(List<Shift> shifts)
        {
            double score = 10.0;
            var shiftsByStaff = shifts
                .GroupBy(s => s.StaffId)
                .ToDictionary(g => g.Key, g => g.OrderBy(s => s.Date).ToList());
            
            foreach (var staffShifts in shiftsByStaff.Values)
            {
                for (int i = 0; i < staffShifts.Count - 1; i++)
                {
                    var currentShift = staffShifts[i];
                    var nextShift = staffShifts[i + 1];
                    
                    // Verifica se i turni sono consecutivi
                    if ((nextShift.Date - currentShift.Date).Days == 1)
                    {
                        // Penalità per sequenze non ergonomiche
                        if (currentShift.ShiftType == ShiftType.Morning && nextShift.ShiftType == ShiftType.Night)
                        {
                            score -= 1.0; // Penalità per turno di notte dopo mattina
                        }
                        else if (currentShift.ShiftType == ShiftType.Night && nextShift.ShiftType == ShiftType.Morning)
                        {
                            score -= 0.5; // Penalità per turno di mattina dopo notte
                        }
                    }
                }
            }
            
            return Math.Max(0, Math.Min(10, score));
        }
        
        private double CalculateWeekendBalanceScore(List<Shift> shifts, List<Staff> staff)
        {
            // Identifica i weekend dagli shift
            var dates = shifts.Select(s => s.Date).Distinct().OrderBy(d => d).ToList();
            var weekends = new List<(DateTime Saturday, DateTime Sunday)>();
            
            foreach (var date in dates)
            {
                if (date.DayOfWeek == DayOfWeek.Saturday)
                {
                    var sunday = date.AddDays(1);
                    if (dates.Contains(sunday))
                    {
                        weekends.Add((date, sunday));
                    }
                }
            }
            
            // Calcola quanti weekend lavora ogni staffer
            var workingWeekends = new Dictionary<int, int>();
            foreach (var s in staff)
            {
                workingWeekends[s.Id] = 0;
            }
            
            foreach (var weekend in weekends)
            {
                foreach (var staffId in staff.Select(s => s.Id))
                {
                    var saturdayShift = shifts.FirstOrDefault(s => 
                        s.StaffId == staffId && s.Date == weekend.Saturday);
                    
                    var sundayShift = shifts.FirstOrDefault(s => 
                        s.StaffId == staffId && s.Date == weekend.Sunday);
                    
                    bool workingSaturday = saturdayShift != null && 
                        saturdayShift.ShiftType != ShiftType.Rest && 
                        saturdayShift.ShiftType != ShiftType.Vacation;
                    
                    bool workingSunday = sundayShift != null && 
                        sundayShift.ShiftType != ShiftType.Rest && 
                        sundayShift.ShiftType != ShiftType.Vacation;
                    
                    if (workingSaturday || workingSunday)
                    {
                        workingWeekends[staffId]++;
                    }
                }
            }
            
            // Calcola la deviazione standard
            if (weekends.Count == 0 || workingWeekends.Count == 0)
                return 10.0; // Se non ci sono weekend, il punteggio è massimo
                
            double mean = workingWeekends.Values.Average();
            double sumOfSquaredDifferences = workingWeekends.Values.Sum(count => Math.Pow(count - mean, 2));
            double stdDev = Math.Sqrt(sumOfSquaredDifferences / workingWeekends.Count);
            
            // Normalizza in un punteggio da 0 a 10
            double maxAllowedStdDev = weekends.Count / 2.0;
            double score = 10 * (1 - Math.Min(1, stdDev / maxAllowedStdDev));
            
            return Math.Max(0, Math.Min(10, score));
        }
        
        private double CalculateNightShiftDistribution(List<Shift> shifts, List<Staff> staff)
        {
            // Calcola il numero di turni notturni per membro dello staff
            var nightShifts = new Dictionary<int, int>();
            foreach (var s in staff)
            {
                nightShifts[s.Id] = 0;
            }
            
            foreach (var shift in shifts)
            {
                if (shift.ShiftType == ShiftType.Night)
                {
                    nightShifts[shift.StaffId]++;
                }
            }
            
            // Calcola la deviazione standard
            double mean = nightShifts.Values.Average();
            double sumOfSquaredDifferences = nightShifts.Values.Sum(count => Math.Pow(count - mean, 2));
            double stdDev = Math.Sqrt(sumOfSquaredDifferences / nightShifts.Count);
            
            // Normalizza in un punteggio da 0 a 10
            double totalNights = shifts.Count(s => s.ShiftType == ShiftType.Night);
            double maxAllowedStdDev = totalNights / staff.Count / 2.0;
            double score = 10 * (1 - Math.Min(1, stdDev / Math.Max(1, maxAllowedStdDev)));
            
            return Math.Max(0, Math.Min(10, score));
        }
    }
}
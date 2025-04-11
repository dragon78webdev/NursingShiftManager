using System.Text.Json;
using NurseSchedulerAPI.Models;
using NurseSchedulerAPI.Repositories;

namespace NurseSchedulerAPI.Services
{
    public class SchedulerService
    {
        private readonly IStaffRepository _staffRepository;
        private readonly IShiftRepository _shiftRepository;
        private readonly IVacationRepository _vacationRepository;
        private readonly IScheduleGenerationRepository _scheduleGenerationRepository;
        private readonly ILogger<SchedulerService> _logger;

        // Costanti per l'algoritmo di ottimizzazione
        private const int MAX_CONSECUTIVE_WORK_DAYS = 6;
        private const int MIN_REST_DAYS_AFTER_NIGHT = 2;
        private const int MIN_CONSECUTIVE_REST_DAYS = 2;
        private const int WEEKEND_WEIGHT = 2; // Peso per i weekend
        private const int PREFERRED_SHIFT_WEIGHT = 3; // Peso per i turni preferiti
        private const int AVOID_M_AFTER_N_WEIGHT = 5; // Peso per evitare mattino dopo notte
        
        // Tipo di turni disponibili
        private readonly List<string> _shiftTypes = new List<string> { "M", "P", "N", "R", "F" };
        // M = Mattino (7-14)
        // P = Pomeriggio (14-22)
        // N = Notte (22-7)
        // R = Riposo
        // F = Ferie

        public SchedulerService(
            IStaffRepository staffRepository,
            IShiftRepository shiftRepository,
            IVacationRepository vacationRepository,
            IScheduleGenerationRepository scheduleGenerationRepository,
            ILogger<SchedulerService> logger)
        {
            _staffRepository = staffRepository;
            _shiftRepository = shiftRepository;
            _vacationRepository = vacationRepository;
            _scheduleGenerationRepository = scheduleGenerationRepository;
            _logger = logger;
        }

        /// <summary>
        /// Genera un nuovo planning per il periodo specificato
        /// </summary>
        public async Task<ScheduleGenerationResult> GenerateScheduleAsync(
            DateTime startDate, 
            DateTime endDate, 
            string staffType,
            int generatedById,
            Dictionary<string, object>? parameters = null)
        {
            _logger.LogInformation($"Avvio generazione planning dal {startDate:dd/MM/yyyy} al {endDate:dd/MM/yyyy} per {staffType}");
            
            try
            {
                // Registra l'inizio della generazione
                var scheduleGeneration = new ScheduleGeneration
                {
                    StartDate = startDate,
                    EndDate = endDate,
                    StaffType = staffType,
                    GeneratedById = generatedById,
                    Parameters = parameters != null ? JsonSerializer.Serialize(parameters) : null,
                    CreatedAt = DateTime.UtcNow
                };

                var savedGeneration = await _scheduleGenerationRepository.CreateAsync(scheduleGeneration);

                // Recupera lo staff disponibile
                var staffMembers = await _staffRepository.GetByRoleAsync(staffType);
                
                if (!staffMembers.Any())
                {
                    return new ScheduleGenerationResult
                    {
                        Success = false,
                        Message = $"Nessun membro dello staff trovato con ruolo {staffType}",
                        GeneratedShifts = new List<Shift>()
                    };
                }

                // Ottiene le ferie già approvate nel periodo
                var vacations = await _vacationRepository.GetByDateRangeAsync(startDate, endDate);
                
                // Dizionario per tenere traccia delle ferie per ciascun membro del personale
                var vacationsByStaffId = vacations
                    .Where(v => v.Approved == true)
                    .GroupBy(v => v.StaffId)
                    .ToDictionary(g => g.Key, g => g.ToList());

                // Recupera i turni già assegnati in un periodo precedente contiguo
                // per verificare i vincoli di continuità
                var previousPeriodStart = startDate.AddDays(-7);
                var previousShifts = await _shiftRepository.GetByDateRangeAsync(previousPeriodStart, startDate.AddDays(-1));
                
                // Raggruppati per membro dello staff
                var previousShiftsByStaffId = previousShifts
                    .GroupBy(s => s.StaffId)
                    .ToDictionary(g => g.Key, g => g.OrderBy(s => s.Date).ToList());

                // Inizializza il risultato
                var result = new ScheduleGenerationResult
                {
                    Success = true,
                    Message = "Planning generato con successo",
                    GeneratedShifts = new List<Shift>(),
                    QualityMetrics = new ScheduleQualityMetrics()
                };

                // Genera il planning utilizzando un algoritmo di ottimizzazione
                var schedule = await GenerateOptimizedScheduleAsync(
                    staffMembers.ToList(),
                    startDate,
                    endDate,
                    vacationsByStaffId,
                    previousShiftsByStaffId,
                    parameters
                );

                // Aggiorna le metriche di qualità
                result.QualityMetrics = CalculateQualityMetrics(schedule, staffMembers.ToList(), startDate, endDate);

                // Salva i turni generati nel database
                foreach (var shift in schedule)
                {
                    var savedShift = await _shiftRepository.CreateAsync(shift);
                    result.GeneratedShifts.Add(savedShift);
                }

                _logger.LogInformation($"Planning generato con successo: {result.GeneratedShifts.Count} turni creati");
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Errore nella generazione del planning");
                return new ScheduleGenerationResult
                {
                    Success = false,
                    Message = $"Errore nella generazione del planning: {ex.Message}",
                    GeneratedShifts = new List<Shift>()
                };
            }
        }

        /// <summary>
        /// Genera un planning ottimizzato utilizzando un algoritmo di ricerca locale
        /// </summary>
        private async Task<List<Shift>> GenerateOptimizedScheduleAsync(
            List<Staff> staffMembers,
            DateTime startDate,
            DateTime endDate,
            Dictionary<int, List<Vacation>> vacationsByStaffId,
            Dictionary<int, List<Shift>> previousShiftsByStaffId,
            Dictionary<string, object>? parameters = null)
        {
            _logger.LogInformation($"Avvio ottimizzazione planning per {staffMembers.Count} membri dello staff");
            
            // Estrai parametri di ottimizzazione, se forniti
            var maxIterations = GetParameterValue(parameters, "maxIterations", 1000);
            var coolingRate = GetParameterValue(parameters, "coolingRate", 0.995);
            var initialTemperature = GetParameterValue(parameters, "initialTemperature", 100.0);
            
            // Genera una soluzione iniziale
            var currentSolution = GenerateInitialSolution(staffMembers, startDate, endDate, vacationsByStaffId);
            
            // Applica i vincoli rigidi
            ApplyHardConstraints(currentSolution, staffMembers, startDate, endDate, vacationsByStaffId, previousShiftsByStaffId);
            
            // Calcola il punteggio iniziale
            double currentScore = EvaluateSchedule(currentSolution, staffMembers, startDate, endDate, previousShiftsByStaffId);
            
            // Inizializza le variabili per l'algoritmo di simulated annealing
            var bestSolution = new List<Shift>(currentSolution);
            double bestScore = currentScore;
            double temperature = initialTemperature;
            var random = new Random();
            
            _logger.LogInformation($"Inizio ottimizzazione con punteggio iniziale: {currentScore}");
            
            // Esegui l'algoritmo di simulated annealing
            for (int iteration = 0; iteration < maxIterations; iteration++)
            {
                // Genera una nuova soluzione modificando quella corrente
                var newSolution = GenerateNeighborSolution(currentSolution, staffMembers, startDate, endDate, vacationsByStaffId);
                
                // Applica i vincoli rigidi alla nuova soluzione
                ApplyHardConstraints(newSolution, staffMembers, startDate, endDate, vacationsByStaffId, previousShiftsByStaffId);
                
                // Calcola il nuovo punteggio
                double newScore = EvaluateSchedule(newSolution, staffMembers, startDate, endDate, previousShiftsByStaffId);
                
                // Calcola la differenza di punteggio
                double scoreDifference = newScore - currentScore;
                
                // Decidi se accettare la nuova soluzione
                if (scoreDifference > 0 || random.NextDouble() < Math.Exp(scoreDifference / temperature))
                {
                    currentSolution = newSolution;
                    currentScore = newScore;
                    
                    // Aggiorna la migliore soluzione trovata
                    if (currentScore > bestScore)
                    {
                        bestSolution = new List<Shift>(currentSolution);
                        bestScore = currentScore;
                        _logger.LogDebug($"Trovata nuova soluzione migliore con punteggio: {bestScore}");
                    }
                }
                
                // Riduci la temperatura (raffreddamento)
                temperature *= coolingRate;
                
                // Log di progresso ogni 100 iterazioni
                if (iteration % 100 == 0)
                {
                    _logger.LogDebug($"Iterazione {iteration}, temperatura: {temperature}, punteggio corrente: {currentScore}, miglior punteggio: {bestScore}");
                }
            }
            
            _logger.LogInformation($"Ottimizzazione completata. Miglior punteggio: {bestScore}");
            
            // Converti la migliore soluzione trovata in turni
            return ConvertSolutionToShifts(bestSolution, staffMembers, startDate, endDate);
        }

        /// <summary>
        /// Genera una soluzione iniziale casuale
        /// </summary>
        private List<ShiftAssignment> GenerateInitialSolution(
            List<Staff> staffMembers,
            DateTime startDate,
            DateTime endDate,
            Dictionary<int, List<Vacation>> vacationsByStaffId)
        {
            var solution = new List<ShiftAssignment>();
            var random = new Random();
            var dayCount = (int)(endDate - startDate).TotalDays + 1;
            
            // Per ogni giorno e per ogni membro dello staff
            for (int day = 0; day < dayCount; day++)
            {
                var currentDate = startDate.AddDays(day);
                
                foreach (var staff in staffMembers)
                {
                    // Controlla se il membro dello staff è in ferie
                    if (IsOnVacation(staff.Id, currentDate, vacationsByStaffId))
                    {
                        // Assegna il turno "F" (ferie)
                        solution.Add(new ShiftAssignment
                        {
                            StaffId = staff.Id,
                            Date = currentDate,
                            ShiftType = "F"
                        });
                    }
                    else
                    {
                        // Assegna un turno casuale (escluso F)
                        var availableShiftTypes = _shiftTypes.Where(t => t != "F").ToList();
                        var randomShiftType = availableShiftTypes[random.Next(availableShiftTypes.Count)];
                        
                        solution.Add(new ShiftAssignment
                        {
                            StaffId = staff.Id,
                            Date = currentDate,
                            ShiftType = randomShiftType
                        });
                    }
                }
            }
            
            return solution;
        }

        /// <summary>
        /// Applica i vincoli rigidi alla soluzione
        /// </summary>
        private void ApplyHardConstraints(
            List<ShiftAssignment> solution,
            List<Staff> staffMembers,
            DateTime startDate,
            DateTime endDate,
            Dictionary<int, List<Vacation>> vacationsByStaffId,
            Dictionary<int, List<Shift>> previousShiftsByStaffId)
        {
            var dayCount = (int)(endDate - startDate).TotalDays + 1;
            
            // Per ogni giorno, assicurati che ci sia una distribuzione equilibrata dei turni
            for (int day = 0; day < dayCount; day++)
            {
                var currentDate = startDate.AddDays(day);
                var dayAssignments = solution.Where(s => s.Date.Date == currentDate.Date).ToList();
                
                // Calcola quanti membri dello staff sono disponibili (non in ferie)
                var availableStaffCount = dayAssignments.Count(a => a.ShiftType != "F");
                
                // Calcola il numero minimo di turni richiesti per ogni tipo (escludendo R e F)
                var minMorningShifts = Math.Max(1, availableStaffCount / 3);
                var minAfternoonShifts = Math.Max(1, availableStaffCount / 3);
                var minNightShifts = Math.Max(1, availableStaffCount / 6); // Meno turni di notte
                
                // Conta i turni attuali
                var morningShifts = dayAssignments.Count(a => a.ShiftType == "M");
                var afternoonShifts = dayAssignments.Count(a => a.ShiftType == "P");
                var nightShifts = dayAssignments.Count(a => a.ShiftType == "N");
                
                // Aggiusta i turni se necessario
                AdjustShiftDistribution(dayAssignments, "M", minMorningShifts - morningShifts);
                AdjustShiftDistribution(dayAssignments, "P", minAfternoonShifts - afternoonShifts);
                AdjustShiftDistribution(dayAssignments, "N", minNightShifts - nightShifts);
            }
            
            // Per ogni membro dello staff, applica i vincoli di continuità e riposo
            foreach (var staff in staffMembers)
            {
                // Ottieni tutti i turni di questo membro dello staff, ordinati per data
                var staffAssignments = solution
                    .Where(s => s.StaffId == staff.Id)
                    .OrderBy(s => s.Date)
                    .ToList();
                
                // Ottieni i turni precedenti, se disponibili
                List<Shift>? previousShifts = null;
                if (previousShiftsByStaffId.TryGetValue(staff.Id, out var shifts))
                {
                    previousShifts = shifts;
                }
                
                // Applica i vincoli
                ApplyStaffHardConstraints(staffAssignments, previousShifts);
            }
        }

        /// <summary>
        /// Aggiusta la distribuzione dei turni per un giorno
        /// </summary>
        private void AdjustShiftDistribution(List<ShiftAssignment> dayAssignments, string shiftType, int difference)
        {
            var random = new Random();
            
            // Se abbiamo bisogno di più turni di questo tipo
            if (difference > 0)
            {
                // Prendi i membri dello staff che non sono in ferie e non hanno già questo tipo di turno
                var availableAssignments = dayAssignments
                    .Where(a => a.ShiftType != "F" && a.ShiftType != shiftType)
                    .ToList();
                
                // Mescola la lista per casualità
                Shuffle(availableAssignments);
                
                // Cambia il turno per il numero richiesto di membri dello staff
                for (int i = 0; i < Math.Min(difference, availableAssignments.Count); i++)
                {
                    availableAssignments[i].ShiftType = shiftType;
                }
            }
            // Se abbiamo troppi turni di questo tipo
            else if (difference < 0)
            {
                // Prendi i membri dello staff con questo tipo di turno
                var assignmentsToChange = dayAssignments
                    .Where(a => a.ShiftType == shiftType)
                    .ToList();
                
                // Mescola la lista per casualità
                Shuffle(assignmentsToChange);
                
                // Cambia il turno per il numero richiesto di membri dello staff
                for (int i = 0; i < Math.Min(-difference, assignmentsToChange.Count); i++)
                {
                    // Assegna un turno di riposo
                    assignmentsToChange[i].ShiftType = "R";
                }
            }
        }

        /// <summary>
        /// Applica i vincoli rigidi per un singolo membro dello staff
        /// </summary>
        private void ApplyStaffHardConstraints(List<ShiftAssignment> staffAssignments, List<Shift>? previousShifts)
        {
            // Controlla se ci sono troppi giorni consecutivi di lavoro
            int consecutiveWorkDays = 0;
            string previousShiftType = "";
            
            // Considera i turni precedenti per la continuità
            if (previousShifts != null && previousShifts.Count > 0)
            {
                // Conta i giorni consecutivi di lavoro dai turni precedenti
                for (int i = previousShifts.Count - 1; i >= 0; i--)
                {
                    var shift = previousShifts[i];
                    if (shift.ShiftType != "R" && shift.ShiftType != "F")
                    {
                        consecutiveWorkDays++;
                        previousShiftType = shift.ShiftType;
                    }
                    else
                    {
                        break; // Interrompi se trovi un giorno di riposo
                    }
                }
            }
            
            // Applica i vincoli per ogni giorno
            for (int i = 0; i < staffAssignments.Count; i++)
            {
                var assignment = staffAssignments[i];
                
                // Salta i giorni di ferie
                if (assignment.ShiftType == "F")
                {
                    consecutiveWorkDays = 0;
                    previousShiftType = "F";
                    continue;
                }
                
                // Controlla se il turno precedente era di notte
                if (previousShiftType == "N")
                {
                    // Dopo un turno di notte, garantisci almeno MIN_REST_DAYS_AFTER_NIGHT giorni di riposo
                    for (int j = 0; j < MIN_REST_DAYS_AFTER_NIGHT && i + j < staffAssignments.Count; j++)
                    {
                        // Se il giorno è già in ferie, salta
                        if (staffAssignments[i + j].ShiftType == "F")
                            continue;
                        
                        staffAssignments[i + j].ShiftType = "R";
                    }
                    
                    // Aggiorna l'indice e i contatori
                    i += MIN_REST_DAYS_AFTER_NIGHT - 1; // -1 perché il ciclo incrementerà i
                    consecutiveWorkDays = 0;
                    previousShiftType = "R";
                    continue;
                }
                
                // Controlla se ci sono troppi giorni consecutivi di lavoro
                if (assignment.ShiftType != "R" && consecutiveWorkDays >= MAX_CONSECUTIVE_WORK_DAYS)
                {
                    // Assegna un giorno di riposo
                    assignment.ShiftType = "R";
                    consecutiveWorkDays = 0;
                }
                else if (assignment.ShiftType != "R")
                {
                    // Incrementa il contatore dei giorni consecutivi di lavoro
                    consecutiveWorkDays++;
                }
                else
                {
                    // Giorno di riposo
                    consecutiveWorkDays = 0;
                }
                
                // Aggiorna il tipo di turno precedente
                previousShiftType = assignment.ShiftType;
            }
            
            // Garantisci giorni di riposo consecutivi
            for (int i = 0; i < staffAssignments.Count - 1; i++)
            {
                // Se è un giorno di riposo ma non fa parte di una sequenza, crea una sequenza
                if (staffAssignments[i].ShiftType == "R" && 
                    (i == 0 || staffAssignments[i - 1].ShiftType != "R"))
                {
                    // Controlla quanti giorni di riposo consecutivi ci sono già
                    int consecutiveRestDays = 1;
                    while (i + consecutiveRestDays < staffAssignments.Count && 
                           staffAssignments[i + consecutiveRestDays].ShiftType == "R")
                    {
                        consecutiveRestDays++;
                    }
                    
                    // Se non ci sono abbastanza giorni di riposo consecutivi, aggiungi altri
                    if (consecutiveRestDays < MIN_CONSECUTIVE_REST_DAYS)
                    {
                        for (int j = 1; j < MIN_CONSECUTIVE_REST_DAYS && i + j < staffAssignments.Count; j++)
                        {
                            // Se il giorno è già in ferie, salta
                            if (staffAssignments[i + j].ShiftType == "F")
                                continue;
                            
                            staffAssignments[i + j].ShiftType = "R";
                        }
                    }
                    
                    // Aggiorna l'indice
                    i += Math.Max(consecutiveRestDays, MIN_CONSECUTIVE_REST_DAYS) - 1;
                }
            }
        }

        /// <summary>
        /// Genera una soluzione vicina modificando quella corrente
        /// </summary>
        private List<ShiftAssignment> GenerateNeighborSolution(
            List<ShiftAssignment> currentSolution,
            List<Staff> staffMembers,
            DateTime startDate,
            DateTime endDate,
            Dictionary<int, List<Vacation>> vacationsByStaffId)
        {
            // Copia la soluzione corrente
            var newSolution = new List<ShiftAssignment>(currentSolution.Select(s => new ShiftAssignment
            {
                StaffId = s.StaffId,
                Date = s.Date,
                ShiftType = s.ShiftType
            }));
            
            var random = new Random();
            
            // Scegli casualmente una modifica da applicare
            int modificationChoice = random.Next(3);
            
            switch (modificationChoice)
            {
                case 0:
                    // Scambia i turni tra due membri dello staff per un giorno casuale
                    SwapShiftsBetweenStaff(newSolution, staffMembers, startDate, endDate, vacationsByStaffId);
                    break;
                    
                case 1:
                    // Cambia il tipo di turno per un membro dello staff in un giorno casuale
                    ChangeShiftType(newSolution, staffMembers, startDate, endDate, vacationsByStaffId);
                    break;
                    
                case 2:
                    // Scambia i turni per un membro dello staff in due giorni diversi
                    SwapShiftsBetweenDays(newSolution, staffMembers, startDate, endDate, vacationsByStaffId);
                    break;
            }
            
            return newSolution;
        }

        /// <summary>
        /// Scambia i turni tra due membri dello staff per un giorno casuale
        /// </summary>
        private void SwapShiftsBetweenStaff(
            List<ShiftAssignment> solution,
            List<Staff> staffMembers,
            DateTime startDate,
            DateTime endDate,
            Dictionary<int, List<Vacation>> vacationsByStaffId)
        {
            var random = new Random();
            var dayCount = (int)(endDate - startDate).TotalDays + 1;
            
            // Scegli un giorno casuale
            int randomDayOffset = random.Next(dayCount);
            var randomDate = startDate.AddDays(randomDayOffset);
            
            // Ottieni i turni per quel giorno
            var dayAssignments = solution
                .Where(s => s.Date.Date == randomDate.Date)
                .ToList();
            
            // Filtra i membri dello staff che non sono in ferie
            var availableAssignments = dayAssignments
                .Where(a => a.ShiftType != "F")
                .ToList();
            
            // Se ci sono meno di 2 membri disponibili, non possiamo scambiare
            if (availableAssignments.Count < 2)
                return;
            
            // Scegli due membri casuali
            int index1 = random.Next(availableAssignments.Count);
            int index2;
            do
            {
                index2 = random.Next(availableAssignments.Count);
            } while (index2 == index1);
            
            // Scambia i turni
            string tempShiftType = availableAssignments[index1].ShiftType;
            availableAssignments[index1].ShiftType = availableAssignments[index2].ShiftType;
            availableAssignments[index2].ShiftType = tempShiftType;
        }

        /// <summary>
        /// Cambia il tipo di turno per un membro dello staff in un giorno casuale
        /// </summary>
        private void ChangeShiftType(
            List<ShiftAssignment> solution,
            List<Staff> staffMembers,
            DateTime startDate,
            DateTime endDate,
            Dictionary<int, List<Vacation>> vacationsByStaffId)
        {
            var random = new Random();
            
            // Scegli un membro dello staff casuale
            int randomStaffIndex = random.Next(staffMembers.Count);
            var randomStaff = staffMembers[randomStaffIndex];
            
            // Ottieni i turni di questo membro dello staff
            var staffAssignments = solution
                .Where(s => s.StaffId == randomStaff.Id)
                .ToList();
            
            // Filtra i turni che non sono ferie
            var availableAssignments = staffAssignments
                .Where(a => a.ShiftType != "F")
                .ToList();
            
            // Se non ci sono turni disponibili, esci
            if (availableAssignments.Count == 0)
                return;
            
            // Scegli un turno casuale da modificare
            int randomAssignmentIndex = random.Next(availableAssignments.Count);
            var assignmentToChange = availableAssignments[randomAssignmentIndex];
            
            // Scegli un nuovo tipo di turno diverso dall'attuale (escluso F)
            var currentShiftType = assignmentToChange.ShiftType;
            var availableShiftTypes = _shiftTypes.Where(t => t != currentShiftType && t != "F").ToList();
            
            // Se non ci sono tipi di turno disponibili, esci
            if (availableShiftTypes.Count == 0)
                return;
            
            // Assegna un nuovo tipo di turno casuale
            string newShiftType = availableShiftTypes[random.Next(availableShiftTypes.Count)];
            assignmentToChange.ShiftType = newShiftType;
        }

        /// <summary>
        /// Scambia i turni per un membro dello staff in due giorni diversi
        /// </summary>
        private void SwapShiftsBetweenDays(
            List<ShiftAssignment> solution,
            List<Staff> staffMembers,
            DateTime startDate,
            DateTime endDate,
            Dictionary<int, List<Vacation>> vacationsByStaffId)
        {
            var random = new Random();
            var dayCount = (int)(endDate - startDate).TotalDays + 1;
            
            // Scegli un membro dello staff casuale
            int randomStaffIndex = random.Next(staffMembers.Count);
            var randomStaff = staffMembers[randomStaffIndex];
            
            // Ottieni i turni di questo membro dello staff
            var staffAssignments = solution
                .Where(s => s.StaffId == randomStaff.Id)
                .ToList();
            
            // Filtra i turni che non sono ferie
            var availableAssignments = staffAssignments
                .Where(a => a.ShiftType != "F")
                .ToList();
            
            // Se ci sono meno di 2 turni disponibili, non possiamo scambiare
            if (availableAssignments.Count < 2)
                return;
            
            // Scegli due giorni casuali
            int index1 = random.Next(availableAssignments.Count);
            int index2;
            do
            {
                index2 = random.Next(availableAssignments.Count);
            } while (index2 == index1);
            
            // Scambia i turni
            string tempShiftType = availableAssignments[index1].ShiftType;
            availableAssignments[index1].ShiftType = availableAssignments[index2].ShiftType;
            availableAssignments[index2].ShiftType = tempShiftType;
        }

        /// <summary>
        /// Valuta la qualità di un planning
        /// </summary>
        private double EvaluateSchedule(
            List<ShiftAssignment> solution,
            List<Staff> staffMembers,
            DateTime startDate,
            DateTime endDate,
            Dictionary<int, List<Shift>> previousShiftsByStaffId)
        {
            double score = 0.0;
            
            // Valuta il bilanciamento del carico di lavoro
            score += EvaluateWorkloadBalance(solution, staffMembers);
            
            // Valuta la distribuzione equa dei weekend
            score += EvaluateWeekendDistribution(solution, staffMembers, startDate, endDate);
            
            // Valuta il rispetto delle preferenze (se disponibili)
            score += EvaluatePreferences(solution, staffMembers);
            
            // Valuta la continuità con i turni precedenti
            score += EvaluateContinuity(solution, staffMembers, previousShiftsByStaffId);
            
            // Valuta l'alternanza dei tipi di turno
            score += EvaluateShiftTypeAlternation(solution, staffMembers);
            
            // Valuta se si evitano turni mattutini dopo turni notturni
            score += EvaluateAvoidMorningAfterNight(solution, staffMembers);
            
            return score;
        }

        /// <summary>
        /// Valuta il bilanciamento del carico di lavoro
        /// </summary>
        private double EvaluateWorkloadBalance(List<ShiftAssignment> solution, List<Staff> staffMembers)
        {
            double score = 0.0;
            
            // Conta il numero di turni di lavoro (non R e non F) per ciascun membro dello staff
            var workloadByStaff = new Dictionary<int, int>();
            foreach (var staff in staffMembers)
            {
                workloadByStaff[staff.Id] = 0;
            }
            
            foreach (var assignment in solution)
            {
                if (assignment.ShiftType != "R" && assignment.ShiftType != "F")
                {
                    workloadByStaff[assignment.StaffId]++;
                }
            }
            
            // Calcola il carico di lavoro medio
            double avgWorkload = workloadByStaff.Values.Average();
            
            // Calcola la deviazione standard
            double sumSquaredDeviations = 0.0;
            foreach (var workload in workloadByStaff.Values)
            {
                sumSquaredDeviations += Math.Pow(workload - avgWorkload, 2);
            }
            double stdDev = Math.Sqrt(sumSquaredDeviations / workloadByStaff.Count);
            
            // Migliore è il bilanciamento (minore deviazione standard), maggiore è il punteggio
            score = 100.0 / (1.0 + stdDev);
            
            return score;
        }

        /// <summary>
        /// Valuta la distribuzione equa dei weekend
        /// </summary>
        private double EvaluateWeekendDistribution(
            List<ShiftAssignment> solution,
            List<Staff> staffMembers,
            DateTime startDate,
            DateTime endDate)
        {
            double score = 0.0;
            
            // Conta quanti weekend di lavoro ha ciascun membro dello staff
            var weekendWorkByStaff = new Dictionary<int, int>();
            foreach (var staff in staffMembers)
            {
                weekendWorkByStaff[staff.Id] = 0;
            }
            
            // Considera ogni weekend nel periodo
            for (DateTime day = startDate; day <= endDate; day = day.AddDays(1))
            {
                // Se è sabato o domenica
                if (day.DayOfWeek == DayOfWeek.Saturday || day.DayOfWeek == DayOfWeek.Sunday)
                {
                    // Controlla chi lavora in questo giorno
                    foreach (var assignment in solution.Where(a => a.Date.Date == day.Date))
                    {
                        if (assignment.ShiftType != "R" && assignment.ShiftType != "F")
                        {
                            weekendWorkByStaff[assignment.StaffId]++;
                        }
                    }
                }
            }
            
            // Calcola la media dei weekend lavorati
            double avgWeekendWork = weekendWorkByStaff.Values.Average();
            
            // Calcola la deviazione standard
            double sumSquaredDeviations = 0.0;
            foreach (var weekendWork in weekendWorkByStaff.Values)
            {
                sumSquaredDeviations += Math.Pow(weekendWork - avgWeekendWork, 2);
            }
            double stdDev = Math.Sqrt(sumSquaredDeviations / weekendWorkByStaff.Count);
            
            // Migliore è la distribuzione (minore deviazione standard), maggiore è il punteggio
            score = 100.0 * WEEKEND_WEIGHT / (1.0 + stdDev);
            
            return score;
        }

        /// <summary>
        /// Valuta il rispetto delle preferenze dei membri dello staff
        /// </summary>
        private double EvaluatePreferences(List<ShiftAssignment> solution, List<Staff> staffMembers)
        {
            // In questo esempio, simuliamo che alcuni membri preferiscono certi tipi di turno
            // In una implementazione reale, queste preferenze sarebbero memorizzate nel database
            double score = 0.0;
            var random = new Random(42); // Seed fisso per ripetibilità
            
            // Genera preferenze casuali ma deterministiche
            var preferences = new Dictionary<int, string>();
            foreach (var staff in staffMembers)
            {
                // Semplice simulazione: assegna una preferenza casuale a ciascun membro
                preferences[staff.Id] = _shiftTypes.Where(t => t != "F").ToList()[random.Next(_shiftTypes.Count - 1)];
            }
            
            // Conta quante volte le preferenze sono rispettate
            int totalPreferencesRespected = 0;
            int totalAssignments = 0;
            
            foreach (var assignment in solution)
            {
                // Salta i giorni di ferie
                if (assignment.ShiftType == "F")
                    continue;
                
                totalAssignments++;
                
                // Se il turno assegnato corrisponde alla preferenza del membro
                if (assignment.ShiftType == preferences[assignment.StaffId])
                {
                    totalPreferencesRespected++;
                }
            }
            
            // Calcola la percentuale di preferenze rispettate
            double preferenceRatio = totalAssignments > 0 
                ? (double)totalPreferencesRespected / totalAssignments 
                : 0.0;
            
            score = 100.0 * PREFERRED_SHIFT_WEIGHT * preferenceRatio;
            
            return score;
        }

        /// <summary>
        /// Valuta la continuità con i turni precedenti
        /// </summary>
        private double EvaluateContinuity(
            List<ShiftAssignment> solution,
            List<Staff> staffMembers,
            Dictionary<int, List<Shift>> previousShiftsByStaffId)
        {
            double score = 0.0;
            int violations = 0;
            
            // Per ogni membro dello staff
            foreach (var staff in staffMembers)
            {
                // Se non ci sono turni precedenti, salta
                if (!previousShiftsByStaffId.TryGetValue(staff.Id, out var previousShifts))
                    continue;
                
                // Prendi l'ultimo turno precedente
                if (previousShifts.Count == 0)
                    continue;
                
                var lastPreviousShift = previousShifts.OrderBy(s => s.Date).Last();
                
                // Prendi il primo turno nella nuova soluzione
                var firstNewAssignment = solution
                    .Where(s => s.StaffId == staff.Id)
                    .OrderBy(s => s.Date)
                    .FirstOrDefault();
                
                if (firstNewAssignment == null)
                    continue;
                
                // Controlla la continuità
                if (lastPreviousShift.ShiftType == "N" && firstNewAssignment.ShiftType != "R" && firstNewAssignment.ShiftType != "F")
                {
                    // Violazione: dopo un turno di notte dovrebbe esserci riposo
                    violations++;
                }
            }
            
            // Penalizza le violazioni
            score = 100.0 - (10.0 * violations);
            
            return Math.Max(0.0, score);
        }

        /// <summary>
        /// Valuta l'alternanza dei tipi di turno
        /// </summary>
        private double EvaluateShiftTypeAlternation(List<ShiftAssignment> solution, List<Staff> staffMembers)
        {
            double score = 0.0;
            int totalStaff = staffMembers.Count;
            double totalScore = 0.0;
            
            // Per ogni membro dello staff
            foreach (var staff in staffMembers)
            {
                // Ottieni i turni ordinati per data
                var staffAssignments = solution
                    .Where(s => s.StaffId == staff.Id)
                    .OrderBy(s => s.Date)
                    .ToList();
                
                int consecutiveSameShiftType = 1;
                int violations = 0;
                
                // Conta le sequenze dello stesso tipo di turno (esclusi R e F)
                for (int i = 1; i < staffAssignments.Count; i++)
                {
                    if (staffAssignments[i].ShiftType == staffAssignments[i - 1].ShiftType && 
                        staffAssignments[i].ShiftType != "R" && 
                        staffAssignments[i].ShiftType != "F")
                    {
                        consecutiveSameShiftType++;
                        
                        // Se ci sono troppi turni consecutivi dello stesso tipo, conta una violazione
                        if (consecutiveSameShiftType > 2)
                        {
                            violations++;
                        }
                    }
                    else
                    {
                        consecutiveSameShiftType = 1;
                    }
                }
                
                // Calcola il punteggio per questo membro dello staff
                double staffScore = 100.0 - (5.0 * violations);
                totalScore += Math.Max(0.0, staffScore);
            }
            
            // Media dei punteggi
            score = totalStaff > 0 ? totalScore / totalStaff : 0.0;
            
            return score;
        }

        /// <summary>
        /// Valuta se si evitano turni mattutini dopo turni notturni
        /// </summary>
        private double EvaluateAvoidMorningAfterNight(List<ShiftAssignment> solution, List<Staff> staffMembers)
        {
            double score = 0.0;
            int violations = 0;
            
            // Per ogni membro dello staff
            foreach (var staff in staffMembers)
            {
                // Ottieni i turni ordinati per data
                var staffAssignments = solution
                    .Where(s => s.StaffId == staff.Id)
                    .OrderBy(s => s.Date)
                    .ToList();
                
                // Cerca sequenze N -> M
                for (int i = 1; i < staffAssignments.Count; i++)
                {
                    if (staffAssignments[i - 1].ShiftType == "N" && staffAssignments[i].ShiftType == "M")
                    {
                        violations++;
                    }
                }
            }
            
            // Penalizza fortemente le violazioni
            score = 100.0 - (AVOID_M_AFTER_N_WEIGHT * violations);
            
            return Math.Max(0.0, score);
        }

        /// <summary>
        /// Calcola le metriche di qualità del planning
        /// </summary>
        private ScheduleQualityMetrics CalculateQualityMetrics(
            List<ShiftAssignment> solution,
            List<Staff> staffMembers,
            DateTime startDate,
            DateTime endDate)
        {
            var metrics = new ScheduleQualityMetrics();
            
            // Calcola il numero totale di turni assegnati per tipo
            metrics.TotalMorningShifts = solution.Count(a => a.ShiftType == "M");
            metrics.TotalAfternoonShifts = solution.Count(a => a.ShiftType == "P");
            metrics.TotalNightShifts = solution.Count(a => a.ShiftType == "N");
            metrics.TotalRestDays = solution.Count(a => a.ShiftType == "R");
            metrics.TotalVacationDays = solution.Count(a => a.ShiftType == "F");
            
            // Calcola il carico di lavoro per membro dello staff
            var workloadByStaff = new Dictionary<int, Dictionary<string, int>>();
            foreach (var staff in staffMembers)
            {
                workloadByStaff[staff.Id] = new Dictionary<string, int>
                {
                    { "M", 0 },
                    { "P", 0 },
                    { "N", 0 },
                    { "R", 0 },
                    { "F", 0 }
                };
            }
            
            foreach (var assignment in solution)
            {
                workloadByStaff[assignment.StaffId][assignment.ShiftType]++;
            }
            
            // Calcola le statistiche di equilibrio
            metrics.MinWorkload = workloadByStaff.Values.Sum(d => d["M"] + d["P"] + d["N"]).Minimum();
            metrics.MaxWorkload = workloadByStaff.Values.Sum(d => d["M"] + d["P"] + d["N"]).Maximum();
            metrics.AvgWorkload = workloadByStaff.Values.Average(d => d["M"] + d["P"] + d["N"]);
            
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
                    foreach (var assignment in solution.Where(a => a.Date.Date == day.Date))
                    {
                        if (assignment.ShiftType != "R" && assignment.ShiftType != "F")
                        {
                            weekendWorkByStaff[assignment.StaffId]++;
                        }
                    }
                }
            }
            
            metrics.MinWeekendWorkdays = weekendWorkByStaff.Values.Min();
            metrics.MaxWeekendWorkdays = weekendWorkByStaff.Values.Max();
            metrics.AvgWeekendWorkdays = weekendWorkByStaff.Values.Average();
            
            // Calcola il numero di violazioni di sequenza N -> M
            int nightToMorningViolations = 0;
            foreach (var staff in staffMembers)
            {
                var staffAssignments = solution
                    .Where(s => s.StaffId == staff.Id)
                    .OrderBy(s => s.Date)
                    .ToList();
                
                for (int i = 1; i < staffAssignments.Count; i++)
                {
                    if (staffAssignments[i - 1].ShiftType == "N" && staffAssignments[i].ShiftType == "M")
                    {
                        nightToMorningViolations++;
                    }
                }
            }
            
            metrics.NightToMorningViolations = nightToMorningViolations;
            
            // Calcola il punteggio complessivo (su 100)
            double workloadBalanceScore = 30.0 * (1.0 - (metrics.MaxWorkload - metrics.MinWorkload) / metrics.AvgWorkload);
            double weekendBalanceScore = 25.0 * (1.0 - (metrics.MaxWeekendWorkdays - metrics.MinWeekendWorkdays) / Math.Max(1.0, metrics.AvgWeekendWorkdays));
            double nightToMorningScore = 20.0 * (1.0 - Math.Min(1.0, (double)nightToMorningViolations / staffMembers.Count));
            double shiftDistributionScore = 25.0; // Punteggio base
            
            // Valuta la distribuzione dei tipi di turno
            if (metrics.TotalMorningShifts > 0 && metrics.TotalAfternoonShifts > 0 && metrics.TotalNightShifts > 0)
            {
                double morningRatio = (double)metrics.TotalMorningShifts / (metrics.TotalMorningShifts + metrics.TotalAfternoonShifts + metrics.TotalNightShifts);
                double afternoonRatio = (double)metrics.TotalAfternoonShifts / (metrics.TotalMorningShifts + metrics.TotalAfternoonShifts + metrics.TotalNightShifts);
                double nightRatio = (double)metrics.TotalNightShifts / (metrics.TotalMorningShifts + metrics.TotalAfternoonShifts + metrics.TotalNightShifts);
                
                // Idealmente, i turni dovrebbero essere distribuiti circa 40% mattino, 40% pomeriggio, 20% notte
                double idealMorningRatio = 0.4;
                double idealAfternoonRatio = 0.4;
                double idealNightRatio = 0.2;
                
                double distributionDeviation = 
                    Math.Abs(morningRatio - idealMorningRatio) + 
                    Math.Abs(afternoonRatio - idealAfternoonRatio) + 
                    Math.Abs(nightRatio - idealNightRatio);
                
                shiftDistributionScore = 25.0 * (1.0 - distributionDeviation);
            }
            
            // Calcola il punteggio complessivo
            metrics.OverallQualityScore = workloadBalanceScore + weekendBalanceScore + nightToMorningScore + shiftDistributionScore;
            metrics.OverallQualityScore = Math.Max(0.0, Math.Min(100.0, metrics.OverallQualityScore));
            
            return metrics;
        }

        /// <summary>
        /// Converte una soluzione in una lista di turni
        /// </summary>
        private List<Shift> ConvertSolutionToShifts(
            List<ShiftAssignment> solution,
            List<Staff> staffMembers,
            DateTime startDate,
            DateTime endDate)
        {
            var shifts = new List<Shift>();
            
            foreach (var assignment in solution)
            {
                // Crea un nuovo turno
                var shift = new Shift
                {
                    StaffId = assignment.StaffId,
                    Date = assignment.Date,
                    ShiftType = assignment.ShiftType,
                    CreatedAt = DateTime.UtcNow
                };
                
                shifts.Add(shift);
            }
            
            return shifts;
        }

        /// <summary>
        /// Verifica se un membro dello staff è in ferie in una data
        /// </summary>
        private bool IsOnVacation(
            int staffId,
            DateTime date,
            Dictionary<int, List<Vacation>> vacationsByStaffId)
        {
            if (!vacationsByStaffId.TryGetValue(staffId, out var vacations))
                return false;
            
            foreach (var vacation in vacations)
            {
                if (date.Date >= vacation.StartDate.Date && date.Date <= vacation.EndDate.Date)
                    return true;
            }
            
            return false;
        }

        /// <summary>
        /// Ottiene un valore da un dizionario di parametri
        /// </summary>
        private T GetParameterValue<T>(Dictionary<string, object>? parameters, string key, T defaultValue)
        {
            if (parameters == null || !parameters.TryGetValue(key, out var value))
                return defaultValue;
            
            try
            {
                return (T)Convert.ChangeType(value, typeof(T));
            }
            catch
            {
                return defaultValue;
            }
        }

        /// <summary>
        /// Mescola casualmente una lista
        /// </summary>
        private void Shuffle<T>(List<T> list)
        {
            var random = new Random();
            int n = list.Count;
            
            while (n > 1)
            {
                n--;
                int k = random.Next(n + 1);
                T value = list[k];
                list[k] = list[n];
                list[n] = value;
            }
        }
    }

    /// <summary>
    /// Classe per rappresentare un'assegnazione di turno
    /// </summary>
    internal class ShiftAssignment
    {
        public int StaffId { get; set; }
        public DateTime Date { get; set; }
        public string ShiftType { get; set; } = string.Empty;
    }

    /// <summary>
    /// Classe per il risultato della generazione del planning
    /// </summary>
    public class ScheduleGenerationResult
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public List<Shift> GeneratedShifts { get; set; } = new List<Shift>();
        public ScheduleQualityMetrics QualityMetrics { get; set; } = new ScheduleQualityMetrics();
    }

    /// <summary>
    /// Classe per le metriche di qualità del planning
    /// </summary>
    public class ScheduleQualityMetrics
    {
        public int TotalMorningShifts { get; set; }
        public int TotalAfternoonShifts { get; set; }
        public int TotalNightShifts { get; set; }
        public int TotalRestDays { get; set; }
        public int TotalVacationDays { get; set; }
        
        public double MinWorkload { get; set; }
        public double MaxWorkload { get; set; }
        public double AvgWorkload { get; set; }
        
        public int MinWeekendWorkdays { get; set; }
        public int MaxWeekendWorkdays { get; set; }
        public double AvgWeekendWorkdays { get; set; }
        
        public int NightToMorningViolations { get; set; }
        
        public double OverallQualityScore { get; set; }
    }
}
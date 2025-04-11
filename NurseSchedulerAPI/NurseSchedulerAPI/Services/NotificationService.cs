using System.Text.Json;
using NurseSchedulerAPI.Models;
using NurseSchedulerAPI.Repositories;

namespace NurseSchedulerAPI.Services
{
    public class NotificationService
    {
        private readonly INotificationRepository _notificationRepository;
        private readonly IPushSubscriptionRepository _pushSubscriptionRepository;
        private readonly IUserRepository _userRepository;
        private readonly IStaffRepository _staffRepository;
        private readonly ILogger<NotificationService> _logger;
        private readonly IConfiguration _configuration;

        public NotificationService(
            INotificationRepository notificationRepository,
            IPushSubscriptionRepository pushSubscriptionRepository,
            IUserRepository userRepository,
            IStaffRepository staffRepository,
            ILogger<NotificationService> logger,
            IConfiguration configuration)
        {
            _notificationRepository = notificationRepository;
            _pushSubscriptionRepository = pushSubscriptionRepository;
            _userRepository = userRepository;
            _staffRepository = staffRepository;
            _logger = logger;
            _configuration = configuration;
        }

        /// <summary>
        /// Crea una nuova notifica
        /// </summary>
        public async Task<Notification> CreateNotificationAsync(
            int userId, 
            string title, 
            string message, 
            string type = "Info", 
            string? link = null)
        {
            try
            {
                var notification = new Notification
                {
                    UserId = userId,
                    Title = title,
                    Message = message,
                    Type = type,
                    Link = link,
                    Read = false,
                    CreatedAt = DateTime.UtcNow
                };

                var createdNotification = await _notificationRepository.CreateAsync(notification);

                // Invia la notifica push se l'utente ha un dispositivo registrato
                await SendPushNotificationAsync(userId, title, message, type, link);

                return createdNotification;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nella creazione della notifica per l'utente {userId}");
                throw;
            }
        }

        /// <summary>
        /// Invia una notifica push all'utente
        /// </summary>
        private async Task SendPushNotificationAsync(
            int userId, 
            string title, 
            string message, 
            string type, 
            string? link)
        {
            try
            {
                // Recupera le sottoscrizioni push dell'utente
                var subscriptions = await _pushSubscriptionRepository.GetByUserIdAsync(userId);

                if (!subscriptions.Any())
                {
                    _logger.LogInformation($"Nessuna sottoscrizione push trovata per l'utente {userId}");
                    return;
                }

                // Prepara il payload della notifica
                var payload = new
                {
                    notification = new
                    {
                        title,
                        body = message,
                        icon = "/icons/icon-192x192.png",
                        badge = "/icons/badge-72x72.png",
                        vibrate = new[] { 100, 50, 100 },
                        data = new
                        {
                            dateOfArrival = DateTime.UtcNow,
                            primaryKey = 1,
                            type,
                            link
                        },
                        actions = new[]
                        {
                            new { action = "explore", title = "Visualizza" }
                        }
                    }
                };

                // Converti il payload in JSON
                var payloadJson = JsonSerializer.Serialize(payload);

                // Invia la notifica push a ciascuna sottoscrizione
                foreach (var subscription in subscriptions)
                {
                    try
                    {
                        // Aggiorna l'ultima volta che la sottoscrizione è stata utilizzata
                        subscription.LastUsedAt = DateTime.UtcNow;
                        await _pushSubscriptionRepository.UpdateAsync(subscription.Id, subscription);

                        // Qui dovremmo implementare l'invio effettivo tramite Web Push
                        // Per ora, logghiamo solo l'operazione
                        _logger.LogInformation($"Invio notifica push all'utente {userId} con subscription {subscription.Id}");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"Errore nell'invio della notifica push alla subscription {subscription.Id}");
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nell'invio della notifica push all'utente {userId}");
            }
        }

        /// <summary>
        /// Ottiene le notifiche di un utente
        /// </summary>
        public async Task<IEnumerable<Notification>> GetUserNotificationsAsync(int userId, bool unreadOnly = false)
        {
            try
            {
                if (unreadOnly)
                {
                    return await _notificationRepository.GetUnreadByUserIdAsync(userId);
                }
                
                return await _notificationRepository.GetByUserIdAsync(userId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nel recupero delle notifiche per l'utente {userId}");
                throw;
            }
        }

        /// <summary>
        /// Segna una notifica come letta
        /// </summary>
        public async Task<Notification> MarkNotificationAsReadAsync(int notificationId)
        {
            try
            {
                var notification = await _notificationRepository.GetByIdAsync(notificationId);
                if (notification == null)
                {
                    throw new KeyNotFoundException($"Notifica con ID {notificationId} non trovata");
                }

                var updatedNotification = await _notificationRepository.MarkAsReadAsync(notificationId);
                return updatedNotification ?? throw new Exception($"Errore nell'aggiornamento della notifica {notificationId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nel segnare come letta la notifica {notificationId}");
                throw;
            }
        }

        /// <summary>
        /// Notifica per una richiesta di cambio turno
        /// </summary>
        public async Task NotifyChangeRequestAsync(ChangeRequest request)
        {
            try
            {
                // Ottieni i dettagli dello staff
                var staff = await _staffRepository.GetByIdAsync(request.StaffId);
                
                if (staff == null)
                {
                    _logger.LogWarning($"Impossibile trovare lo staff {request.StaffId} per la notifica di cambio turno");
                    return;
                }

                // Ottieni tutti i caposala
                var headNurses = await _staffRepository.GetByRoleAsync("HeadNurse");

                // Crea notifica per ogni caposala
                foreach (var headNurse in headNurses)
                {
                    if (headNurse.User == null) continue;
                    
                    await CreateNotificationAsync(
                        headNurse.User.Id, 
                        "Nuova richiesta di cambio turno", 
                        $"{staff.Name} ha richiesto un cambio turno",
                        "Request",
                        "/change-requests");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Errore nell'invio della notifica per richiesta di cambio turno");
            }
        }

        /// <summary>
        /// Notifica per l'aggiornamento dello stato di una richiesta di cambio turno
        /// </summary>
        public async Task NotifyChangeRequestStatusUpdateAsync(ChangeRequest request)
        {
            try
            {
                var staff = await _staffRepository.GetByIdAsync(request.StaffId);
                
                if (staff?.User == null)
                {
                    _logger.LogWarning($"Impossibile trovare lo staff {request.StaffId} per la notifica di aggiornamento cambio turno");
                    return;
                }

                var statusText = request.Status switch
                {
                    "approved" => "approvata",
                    "rejected" => "rifiutata",
                    _ => "aggiornata"
                };

                await CreateNotificationAsync(
                    staff.User.Id,
                    $"Richiesta di cambio turno {statusText}",
                    $"La tua richiesta di cambio turno è stata {statusText}.",
                    request.Status == "approved" ? "Success" : "Warning",
                    "/change-requests");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Errore nell'invio della notifica per aggiornamento richiesta cambio turno");
            }
        }

        /// <summary>
        /// Notifica per una richiesta di ferie
        /// </summary>
        public async Task NotifyVacationRequestAsync(Vacation vacation)
        {
            try
            {
                var staff = await _staffRepository.GetByIdAsync(vacation.StaffId);
                
                if (staff == null)
                {
                    _logger.LogWarning($"Impossibile trovare lo staff {vacation.StaffId} per la notifica di ferie");
                    return;
                }

                // Ottieni tutti i caposala
                var headNurses = await _staffRepository.GetByRoleAsync("HeadNurse");

                // Crea notifica per ogni caposala
                foreach (var headNurse in headNurses)
                {
                    if (headNurse.User == null) continue;
                    
                    await CreateNotificationAsync(
                        headNurse.User.Id,
                        "Nuova richiesta di ferie",
                        $"{staff.Name} ha richiesto ferie dal {vacation.StartDate:dd/MM/yyyy} al {vacation.EndDate:dd/MM/yyyy}",
                        "Request",
                        "/vacations");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Errore nell'invio della notifica per richiesta di ferie");
            }
        }

        /// <summary>
        /// Notifica per l'aggiornamento dello stato di una richiesta di ferie
        /// </summary>
        public async Task NotifyVacationStatusUpdateAsync(Vacation vacation)
        {
            try
            {
                var staff = await _staffRepository.GetByIdAsync(vacation.StaffId);
                
                if (staff?.User == null)
                {
                    _logger.LogWarning($"Impossibile trovare lo staff {vacation.StaffId} per la notifica di aggiornamento ferie");
                    return;
                }

                var statusText = vacation.Approved.HasValue 
                    ? (vacation.Approved.Value ? "approvata" : "rifiutata")
                    : "aggiornata";

                await CreateNotificationAsync(
                    staff.User.Id,
                    $"Richiesta di ferie {statusText}",
                    $"La tua richiesta di ferie dal {vacation.StartDate:dd/MM/yyyy} al {vacation.EndDate:dd/MM/yyyy} è stata {statusText}.",
                    vacation.Approved == true ? "Success" : "Warning",
                    "/vacations");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Errore nell'invio della notifica per aggiornamento richiesta ferie");
            }
        }

        /// <summary>
        /// Notifica per tutti gli utenti della generazione di un nuovo planning
        /// </summary>
        public async Task NotifyNewScheduleAsync(DateTime startDate, DateTime endDate, string staffType)
        {
            try
            {
                // Ottieni tutti gli utenti interessati
                var staffMembers = await _staffRepository.GetByRoleAsync(staffType);
                
                foreach (var staff in staffMembers)
                {
                    if (staff.User == null) continue;
                    
                    await CreateNotificationAsync(
                        staff.User.Id,
                        "Nuovo planning disponibile",
                        $"È disponibile un nuovo planning dal {startDate:dd/MM/yyyy} al {endDate:dd/MM/yyyy}",
                        "Info",
                        "/schedule");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Errore nell'invio della notifica per nuovo planning");
            }
        }
    }
}
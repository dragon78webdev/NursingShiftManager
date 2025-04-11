using System.Data;
using Dapper;
using NurseSchedulerAPI.Data;
using NurseSchedulerAPI.Models;

namespace NurseSchedulerAPI.Repositories
{
    public class NotificationRepository : INotificationRepository
    {
        private readonly DapperContext _context;
        private readonly ILogger<NotificationRepository> _logger;

        public NotificationRepository(DapperContext context, ILogger<NotificationRepository> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Ottiene una notifica dal suo ID
        /// </summary>
        public async Task<Notification?> GetByIdAsync(int id)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    SELECT n.*, u.*
                    FROM Notifications n
                    LEFT JOIN Users u ON n.UserId = u.Id
                    WHERE n.Id = @Id";

                var notificationDict = new Dictionary<int, Notification>();

                var result = await connection.QueryAsync<Notification, User, Notification>(
                    query,
                    (notification, user) =>
                    {
                        if (!notificationDict.TryGetValue(notification.Id, out var existingNotification))
                        {
                            existingNotification = notification;
                            existingNotification.User = user;
                            notificationDict.Add(existingNotification.Id, existingNotification);
                        }

                        return existingNotification;
                    },
                    new { Id = id },
                    splitOn: "Id"
                );

                return result.FirstOrDefault();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nel recupero della notifica con ID {id}");
                throw;
            }
        }

        /// <summary>
        /// Crea una nuova notifica
        /// </summary>
        public async Task<Notification> CreateAsync(Notification notification)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    INSERT INTO Notifications (UserId, Title, Message, Type, Link, Read, CreatedAt)
                    VALUES (@UserId, @Title, @Message, @Type, @Link, @Read, @CreatedAt);
                    
                    SELECT n.*, u.*
                    FROM Notifications n
                    LEFT JOIN Users u ON n.UserId = u.Id
                    WHERE n.Id = SCOPE_IDENTITY()";

                notification.CreatedAt = DateTime.UtcNow;
                notification.Read = false;

                var notificationDict = new Dictionary<int, Notification>();

                var result = await connection.QueryAsync<Notification, User, Notification>(
                    query,
                    (newNotification, user) =>
                    {
                        newNotification.User = user;
                        return newNotification;
                    },
                    notification,
                    splitOn: "Id"
                );

                var createdNotification = result.FirstOrDefault();
                return createdNotification ?? throw new Exception("Errore nella creazione della notifica");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Errore nella creazione della notifica");
                throw;
            }
        }

        /// <summary>
        /// Aggiorna una notifica esistente
        /// </summary>
        public async Task<Notification?> UpdateAsync(int id, Notification notification)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    UPDATE Notifications 
                    SET Title = @Title, 
                        Message = @Message, 
                        Type = @Type, 
                        Link = @Link, 
                        Read = @Read, 
                        ReadAt = @ReadAt
                    WHERE Id = @Id;
                    
                    SELECT n.*, u.*
                    FROM Notifications n
                    LEFT JOIN Users u ON n.UserId = u.Id
                    WHERE n.Id = @Id";

                notification.Id = id;

                var notificationDict = new Dictionary<int, Notification>();

                var result = await connection.QueryAsync<Notification, User, Notification>(
                    query,
                    (updatedNotification, user) =>
                    {
                        updatedNotification.User = user;
                        return updatedNotification;
                    },
                    notification,
                    splitOn: "Id"
                );

                return result.FirstOrDefault();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nell'aggiornamento della notifica con ID {id}");
                throw;
            }
        }

        /// <summary>
        /// Segna una notifica come letta
        /// </summary>
        public async Task<Notification?> MarkAsReadAsync(int id)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    UPDATE Notifications 
                    SET Read = 1, 
                        ReadAt = @ReadAt
                    WHERE Id = @Id;
                    
                    SELECT n.*, u.*
                    FROM Notifications n
                    LEFT JOIN Users u ON n.UserId = u.Id
                    WHERE n.Id = @Id";

                var parameters = new { Id = id, ReadAt = DateTime.UtcNow };

                var notificationDict = new Dictionary<int, Notification>();

                var result = await connection.QueryAsync<Notification, User, Notification>(
                    query,
                    (updatedNotification, user) =>
                    {
                        updatedNotification.User = user;
                        return updatedNotification;
                    },
                    parameters,
                    splitOn: "Id"
                );

                return result.FirstOrDefault();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nel segnare come letta la notifica con ID {id}");
                throw;
            }
        }

        /// <summary>
        /// Segna tutte le notifiche di un utente come lette
        /// </summary>
        public async Task<int> MarkAllAsReadAsync(int userId)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    UPDATE Notifications 
                    SET Read = 1, 
                        ReadAt = @ReadAt
                    WHERE UserId = @UserId AND Read = 0";

                var parameters = new { UserId = userId, ReadAt = DateTime.UtcNow };

                return await connection.ExecuteAsync(query, parameters);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nel segnare come lette tutte le notifiche dell'utente {userId}");
                throw;
            }
        }

        /// <summary>
        /// Ottiene tutte le notifiche di un utente
        /// </summary>
        public async Task<IEnumerable<Notification>> GetByUserIdAsync(int userId)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    SELECT n.*, u.*
                    FROM Notifications n
                    LEFT JOIN Users u ON n.UserId = u.Id
                    WHERE n.UserId = @UserId
                    ORDER BY n.CreatedAt DESC";

                var notificationDict = new Dictionary<int, Notification>();

                var result = await connection.QueryAsync<Notification, User, Notification>(
                    query,
                    (notification, user) =>
                    {
                        if (!notificationDict.TryGetValue(notification.Id, out var existingNotification))
                        {
                            existingNotification = notification;
                            existingNotification.User = user;
                            notificationDict.Add(existingNotification.Id, existingNotification);
                        }

                        return existingNotification;
                    },
                    new { UserId = userId },
                    splitOn: "Id"
                );

                return notificationDict.Values;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nel recupero delle notifiche dell'utente {userId}");
                throw;
            }
        }

        /// <summary>
        /// Ottiene tutte le notifiche non lette di un utente
        /// </summary>
        public async Task<IEnumerable<Notification>> GetUnreadByUserIdAsync(int userId)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    SELECT n.*, u.*
                    FROM Notifications n
                    LEFT JOIN Users u ON n.UserId = u.Id
                    WHERE n.UserId = @UserId AND n.Read = 0
                    ORDER BY n.CreatedAt DESC";

                var notificationDict = new Dictionary<int, Notification>();

                var result = await connection.QueryAsync<Notification, User, Notification>(
                    query,
                    (notification, user) =>
                    {
                        if (!notificationDict.TryGetValue(notification.Id, out var existingNotification))
                        {
                            existingNotification = notification;
                            existingNotification.User = user;
                            notificationDict.Add(existingNotification.Id, existingNotification);
                        }

                        return existingNotification;
                    },
                    new { UserId = userId },
                    splitOn: "Id"
                );

                return notificationDict.Values;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nel recupero delle notifiche non lette dell'utente {userId}");
                throw;
            }
        }

        /// <summary>
        /// Elimina una notifica
        /// </summary>
        public async Task<bool> DeleteAsync(int id)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = "DELETE FROM Notifications WHERE Id = @Id";

                var affectedRows = await connection.ExecuteAsync(query, new { Id = id });
                return affectedRows > 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nell'eliminazione della notifica con ID {id}");
                throw;
            }
        }
    }

    public interface INotificationRepository
    {
        Task<Notification?> GetByIdAsync(int id);
        Task<Notification> CreateAsync(Notification notification);
        Task<Notification?> UpdateAsync(int id, Notification notification);
        Task<Notification?> MarkAsReadAsync(int id);
        Task<int> MarkAllAsReadAsync(int userId);
        Task<IEnumerable<Notification>> GetByUserIdAsync(int userId);
        Task<IEnumerable<Notification>> GetUnreadByUserIdAsync(int userId);
        Task<bool> DeleteAsync(int id);
    }
}
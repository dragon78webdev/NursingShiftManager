using System.Data;
using Dapper;
using NurseSchedulerAPI.Data;
using NurseSchedulerAPI.Models;

namespace NurseSchedulerAPI.Repositories
{
    public class PushSubscriptionRepository : IPushSubscriptionRepository
    {
        private readonly DapperContext _context;
        private readonly ILogger<PushSubscriptionRepository> _logger;

        public PushSubscriptionRepository(DapperContext context, ILogger<PushSubscriptionRepository> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Ottiene una sottoscrizione push dal suo ID
        /// </summary>
        public async Task<PushSubscription?> GetByIdAsync(int id)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    SELECT ps.*, u.*
                    FROM PushSubscriptions ps
                    LEFT JOIN Users u ON ps.UserId = u.Id
                    WHERE ps.Id = @Id";

                var subscriptionDict = new Dictionary<int, PushSubscription>();

                var result = await connection.QueryAsync<PushSubscription, User, PushSubscription>(
                    query,
                    (subscription, user) =>
                    {
                        if (!subscriptionDict.TryGetValue(subscription.Id, out var existingSubscription))
                        {
                            existingSubscription = subscription;
                            existingSubscription.User = user;
                            subscriptionDict.Add(existingSubscription.Id, existingSubscription);
                        }

                        return existingSubscription;
                    },
                    new { Id = id },
                    splitOn: "Id"
                );

                return result.FirstOrDefault();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nel recupero della sottoscrizione push con ID {id}");
                throw;
            }
        }

        /// <summary>
        /// Ottiene una sottoscrizione push dal suo endpoint
        /// </summary>
        public async Task<PushSubscription?> GetByEndpointAsync(string endpoint)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    SELECT ps.*, u.*
                    FROM PushSubscriptions ps
                    LEFT JOIN Users u ON ps.UserId = u.Id
                    WHERE ps.Endpoint = @Endpoint";

                var subscriptionDict = new Dictionary<int, PushSubscription>();

                var result = await connection.QueryAsync<PushSubscription, User, PushSubscription>(
                    query,
                    (subscription, user) =>
                    {
                        if (!subscriptionDict.TryGetValue(subscription.Id, out var existingSubscription))
                        {
                            existingSubscription = subscription;
                            existingSubscription.User = user;
                            subscriptionDict.Add(existingSubscription.Id, existingSubscription);
                        }

                        return existingSubscription;
                    },
                    new { Endpoint = endpoint },
                    splitOn: "Id"
                );

                return result.FirstOrDefault();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nel recupero della sottoscrizione push con endpoint {endpoint}");
                throw;
            }
        }

        /// <summary>
        /// Crea una nuova sottoscrizione push
        /// </summary>
        public async Task<PushSubscription> CreateAsync(PushSubscription subscription)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    INSERT INTO PushSubscriptions (UserId, Endpoint, P256dh, Auth, DeviceName, DeviceType, CreatedAt, LastUsedAt)
                    VALUES (@UserId, @Endpoint, @P256dh, @Auth, @DeviceName, @DeviceType, @CreatedAt, @LastUsedAt);
                    
                    SELECT ps.*, u.*
                    FROM PushSubscriptions ps
                    LEFT JOIN Users u ON ps.UserId = u.Id
                    WHERE ps.Id = SCOPE_IDENTITY()";

                subscription.CreatedAt = DateTime.UtcNow;
                subscription.LastUsedAt = DateTime.UtcNow;

                var subscriptionDict = new Dictionary<int, PushSubscription>();

                var result = await connection.QueryAsync<PushSubscription, User, PushSubscription>(
                    query,
                    (newSubscription, user) =>
                    {
                        newSubscription.User = user;
                        return newSubscription;
                    },
                    subscription,
                    splitOn: "Id"
                );

                var createdSubscription = result.FirstOrDefault();
                return createdSubscription ?? throw new Exception("Errore nella creazione della sottoscrizione push");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Errore nella creazione della sottoscrizione push");
                throw;
            }
        }

        /// <summary>
        /// Aggiorna una sottoscrizione push esistente
        /// </summary>
        public async Task<PushSubscription?> UpdateAsync(int id, PushSubscription subscription)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    UPDATE PushSubscriptions 
                    SET P256dh = @P256dh, 
                        Auth = @Auth, 
                        DeviceName = @DeviceName, 
                        DeviceType = @DeviceType, 
                        LastUsedAt = @LastUsedAt
                    WHERE Id = @Id;
                    
                    SELECT ps.*, u.*
                    FROM PushSubscriptions ps
                    LEFT JOIN Users u ON ps.UserId = u.Id
                    WHERE ps.Id = @Id";

                subscription.Id = id;
                subscription.LastUsedAt = DateTime.UtcNow;

                var subscriptionDict = new Dictionary<int, PushSubscription>();

                var result = await connection.QueryAsync<PushSubscription, User, PushSubscription>(
                    query,
                    (updatedSubscription, user) =>
                    {
                        updatedSubscription.User = user;
                        return updatedSubscription;
                    },
                    subscription,
                    splitOn: "Id"
                );

                return result.FirstOrDefault();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nell'aggiornamento della sottoscrizione push con ID {id}");
                throw;
            }
        }

        /// <summary>
        /// Ottiene tutte le sottoscrizioni push di un utente
        /// </summary>
        public async Task<IEnumerable<PushSubscription>> GetByUserIdAsync(int userId)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = @"
                    SELECT ps.*, u.*
                    FROM PushSubscriptions ps
                    LEFT JOIN Users u ON ps.UserId = u.Id
                    WHERE ps.UserId = @UserId";

                var subscriptionDict = new Dictionary<int, PushSubscription>();

                var result = await connection.QueryAsync<PushSubscription, User, PushSubscription>(
                    query,
                    (subscription, user) =>
                    {
                        if (!subscriptionDict.TryGetValue(subscription.Id, out var existingSubscription))
                        {
                            existingSubscription = subscription;
                            existingSubscription.User = user;
                            subscriptionDict.Add(existingSubscription.Id, existingSubscription);
                        }

                        return existingSubscription;
                    },
                    new { UserId = userId },
                    splitOn: "Id"
                );

                return subscriptionDict.Values;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nel recupero delle sottoscrizioni push dell'utente {userId}");
                throw;
            }
        }

        /// <summary>
        /// Elimina una sottoscrizione push
        /// </summary>
        public async Task<bool> DeleteAsync(int id)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = "DELETE FROM PushSubscriptions WHERE Id = @Id";

                var affectedRows = await connection.ExecuteAsync(query, new { Id = id });
                return affectedRows > 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nell'eliminazione della sottoscrizione push con ID {id}");
                throw;
            }
        }

        /// <summary>
        /// Elimina una sottoscrizione push dal suo endpoint
        /// </summary>
        public async Task<bool> DeleteByEndpointAsync(string endpoint, int userId)
        {
            try
            {
                using var connection = _context.CreateConnection();
                var query = "DELETE FROM PushSubscriptions WHERE Endpoint = @Endpoint AND UserId = @UserId";

                var affectedRows = await connection.ExecuteAsync(query, new { Endpoint = endpoint, UserId = userId });
                return affectedRows > 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Errore nell'eliminazione della sottoscrizione push con endpoint {endpoint}");
                throw;
            }
        }
    }

    public interface IPushSubscriptionRepository
    {
        Task<PushSubscription?> GetByIdAsync(int id);
        Task<PushSubscription?> GetByEndpointAsync(string endpoint);
        Task<PushSubscription> CreateAsync(PushSubscription subscription);
        Task<PushSubscription?> UpdateAsync(int id, PushSubscription subscription);
        Task<IEnumerable<PushSubscription>> GetByUserIdAsync(int userId);
        Task<bool> DeleteAsync(int id);
        Task<bool> DeleteByEndpointAsync(string endpoint, int userId);
    }
}
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NurseSchedulerAPI.Data;
using NurseSchedulerAPI.Models;
using NurseSchedulerAPI.Services;
using System.Security.Claims;

namespace NurseSchedulerAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class NotificationController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly NotificationService _notificationService;
        private readonly ILogger<NotificationController> _logger;

        public NotificationController(
            ApplicationDbContext context,
            NotificationService notificationService,
            ILogger<NotificationController> logger)
        {
            _context = context;
            _notificationService = notificationService;
            _logger = logger;
        }

        /// <summary>
        /// Ottiene tutte le notifiche dell'utente corrente
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Notification>>> GetMyNotifications([FromQuery] bool unreadOnly = false)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
                var notifications = await _notificationService.GetUserNotificationsAsync(userId, unreadOnly);
                return Ok(notifications);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving notifications");
                return StatusCode(500, new { message = "An error occurred while retrieving notifications" });
            }
        }

        /// <summary>
        /// Segna una notifica come letta
        /// </summary>
        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
                
                var notification = await _context.Notifications.FindAsync(id);
                if (notification == null)
                {
                    return NotFound(new { message = "Notification not found" });
                }

                // Verifica che la notifica appartenga all'utente corrente
                if (notification.UserId != userId)
                {
                    return Forbid();
                }

                notification = await _notificationService.MarkNotificationAsReadAsync(id);
                return Ok(notification);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking notification as read");
                return StatusCode(500, new { message = "An error occurred while marking notification as read" });
            }
        }

        /// <summary>
        /// Segna tutte le notifiche dell'utente come lette
        /// </summary>
        [HttpPut("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
                
                var notifications = await _context.Notifications
                    .Where(n => n.UserId == userId && !n.Read)
                    .ToListAsync();

                foreach (var notification in notifications)
                {
                    notification.Read = true;
                    notification.ReadAt = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();
                return Ok(new { count = notifications.Count });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking all notifications as read");
                return StatusCode(500, new { message = "An error occurred while marking all notifications as read" });
            }
        }

        /// <summary>
        /// Elimina una notifica
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteNotification(int id)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
                
                var notification = await _context.Notifications.FindAsync(id);
                if (notification == null)
                {
                    return NotFound(new { message = "Notification not found" });
                }

                // Verifica che la notifica appartenga all'utente corrente
                if (notification.UserId != userId)
                {
                    return Forbid();
                }

                _context.Notifications.Remove(notification);
                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting notification");
                return StatusCode(500, new { message = "An error occurred while deleting the notification" });
            }
        }

        /// <summary>
        /// Registra una nuova sottoscrizione push per l'utente corrente
        /// </summary>
        [HttpPost("subscriptions")]
        public async Task<ActionResult<PushSubscription>> RegisterPushSubscription([FromBody] PushSubscriptionModel model)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
                
                // Verifica se esiste già una sottoscrizione con lo stesso endpoint
                var existing = await _context.PushSubscriptions
                    .FirstOrDefaultAsync(s => s.Endpoint == model.Endpoint);

                if (existing != null)
                {
                    // Aggiorna la sottoscrizione esistente
                    existing.P256dh = model.Keys.P256dh;
                    existing.Auth = model.Keys.Auth;
                    existing.LastUsedAt = DateTime.UtcNow;
                    
                    await _context.SaveChangesAsync();
                    return Ok(existing);
                }

                // Crea una nuova sottoscrizione
                var subscription = new PushSubscription
                {
                    UserId = userId,
                    Endpoint = model.Endpoint,
                    P256dh = model.Keys.P256dh,
                    Auth = model.Keys.Auth,
                    DeviceName = model.DeviceName,
                    DeviceType = model.DeviceType,
                    CreatedAt = DateTime.UtcNow,
                    LastUsedAt = DateTime.UtcNow
                };

                _context.PushSubscriptions.Add(subscription);
                await _context.SaveChangesAsync();

                return CreatedAtAction(nameof(GetPushSubscription), new { id = subscription.Id }, subscription);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error registering push subscription");
                return StatusCode(500, new { message = "An error occurred while registering the push subscription" });
            }
        }

        /// <summary>
        /// Ottiene una specifica sottoscrizione push
        /// </summary>
        [HttpGet("subscriptions/{id}")]
        public async Task<ActionResult<PushSubscription>> GetPushSubscription(int id)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
                
                var subscription = await _context.PushSubscriptions.FindAsync(id);
                if (subscription == null)
                {
                    return NotFound(new { message = "Subscription not found" });
                }

                // Verifica che la sottoscrizione appartenga all'utente corrente
                if (subscription.UserId != userId)
                {
                    return Forbid();
                }

                return Ok(subscription);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving push subscription");
                return StatusCode(500, new { message = "An error occurred while retrieving the push subscription" });
            }
        }

        /// <summary>
        /// Ottiene tutte le sottoscrizioni push dell'utente corrente
        /// </summary>
        [HttpGet("subscriptions")]
        public async Task<ActionResult<IEnumerable<PushSubscription>>> GetMyPushSubscriptions()
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
                
                var subscriptions = await _context.PushSubscriptions
                    .Where(s => s.UserId == userId)
                    .ToListAsync();

                return Ok(subscriptions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving push subscriptions");
                return StatusCode(500, new { message = "An error occurred while retrieving push subscriptions" });
            }
        }

        /// <summary>
        /// Elimina una sottoscrizione push
        /// </summary>
        [HttpDelete("subscriptions/{id}")]
        public async Task<IActionResult> DeletePushSubscription(int id)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
                
                var subscription = await _context.PushSubscriptions.FindAsync(id);
                if (subscription == null)
                {
                    return NotFound(new { message = "Subscription not found" });
                }

                // Verifica che la sottoscrizione appartenga all'utente corrente
                if (subscription.UserId != userId)
                {
                    return Forbid();
                }

                _context.PushSubscriptions.Remove(subscription);
                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting push subscription");
                return StatusCode(500, new { message = "An error occurred while deleting the push subscription" });
            }
        }

        /// <summary>
        /// Elimina una sottoscrizione push tramite il suo endpoint
        /// </summary>
        [HttpDelete("subscriptions/endpoint")]
        public async Task<IActionResult> DeletePushSubscriptionByEndpoint([FromBody] DeleteSubscriptionModel model)
        {
            if (string.IsNullOrEmpty(model.Endpoint))
            {
                return BadRequest(new { message = "Endpoint is required" });
            }

            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
                
                var subscription = await _context.PushSubscriptions
                    .FirstOrDefaultAsync(s => s.Endpoint == model.Endpoint && s.UserId == userId);

                if (subscription == null)
                {
                    return NotFound(new { message = "Subscription not found" });
                }

                _context.PushSubscriptions.Remove(subscription);
                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting push subscription by endpoint");
                return StatusCode(500, new { message = "An error occurred while deleting the push subscription" });
            }
        }

        /// <summary>
        /// Invia una notifica di test all'utente corrente
        /// </summary>
        [HttpPost("test")]
        public async Task<IActionResult> SendTestNotification()
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
                
                await _notificationService.CreateNotificationAsync(
                    userId,
                    "Notifica di test",
                    "Questa è una notifica di test per verificare il funzionamento del sistema di notifiche.",
                    "Info",
                    null);

                return Ok(new { message = "Test notification sent" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending test notification");
                return StatusCode(500, new { message = "An error occurred while sending the test notification" });
            }
        }
    }

    public class PushSubscriptionModel
    {
        public string Endpoint { get; set; } = string.Empty;
        public KeysModel Keys { get; set; } = new KeysModel();
        public string? DeviceName { get; set; }
        public string? DeviceType { get; set; }
    }

    public class KeysModel
    {
        public string P256dh { get; set; } = string.Empty;
        public string Auth { get; set; } = string.Empty;
    }

    public class DeleteSubscriptionModel
    {
        public string Endpoint { get; set; } = string.Empty;
    }
}
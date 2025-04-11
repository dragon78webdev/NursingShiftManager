using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using NurseScheduler.Models;
using NurseScheduler.Services;

namespace NurseScheduler.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class NotificationsController : ControllerBase
    {
        private readonly INotificationService _notificationService;
        private readonly ILogger<NotificationsController> _logger;

        public NotificationsController(
            INotificationService notificationService,
            ILogger<NotificationsController> logger)
        {
            _notificationService = notificationService;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetMyNotifications()
        {
            try
            {
                var userId = int.Parse(User.Identity?.Name ?? "0");
                
                var notifications = await _notificationService.GetNotificationsByUserIdAsync(userId);
                
                var notificationDtos = notifications.Select(notification => new NotificationDto
                {
                    Id = notification.Id,
                    Title = notification.Title,
                    Message = notification.Message,
                    Read = notification.Read,
                    CreatedAt = notification.CreatedAt
                });
                
                return Ok(notificationDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting notifications");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error retrieving notifications" });
            }
        }

        [HttpGet("unread")]
        public async Task<IActionResult> GetUnreadNotifications()
        {
            try
            {
                var userId = int.Parse(User.Identity?.Name ?? "0");
                
                var notifications = await _notificationService.GetUnreadNotificationsByUserIdAsync(userId);
                
                var notificationDtos = notifications.Select(notification => new NotificationDto
                {
                    Id = notification.Id,
                    Title = notification.Title,
                    Message = notification.Message,
                    Read = notification.Read,
                    CreatedAt = notification.CreatedAt
                });
                
                return Ok(notificationDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting unread notifications");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error retrieving unread notifications" });
            }
        }

        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            try
            {
                var success = await _notificationService.MarkNotificationAsReadAsync(id);
                
                if (!success)
                    return NotFound(new { message = "Notification not found or could not be marked as read" });
                
                return Ok(new { message = "Notification marked as read" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking notification as read");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error marking notification as read" });
            }
        }

        [HttpGet("subscribe")]
        public async Task<IActionResult> SubscribeToPushNotifications([FromQuery] string endpoint, [FromQuery] string p256dh, [FromQuery] string auth)
        {
            try
            {
                var userId = int.Parse(User.Identity?.Name ?? "0");
                
                // In a real implementation, you would store these push subscription details 
                // in a database associated with the user
                
                // For now, we'll just return success
                return Ok(new { message = "Successfully subscribed to push notifications" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error subscribing to push notifications");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Error subscribing to push notifications" });
            }
        }
    }

    public class NotificationDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public bool Read { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
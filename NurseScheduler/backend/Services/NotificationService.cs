using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Mail;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using NurseScheduler.Models;
using NurseScheduler.Repositories;

namespace NurseScheduler.Services
{
    public class NotificationService : INotificationService
    {
        private readonly INotificationRepository _notificationRepository;
        private readonly ILogger<NotificationService> _logger;
        private readonly IConfiguration _configuration;

        public NotificationService(
            INotificationRepository notificationRepository,
            ILogger<NotificationService> logger,
            IConfiguration configuration)
        {
            _notificationRepository = notificationRepository;
            _logger = logger;
            _configuration = configuration;
        }

        public async Task<IEnumerable<Notification>> GetNotificationsByUserIdAsync(int userId)
        {
            return await _notificationRepository.GetByUserIdAsync(userId);
        }

        public async Task<IEnumerable<Notification>> GetUnreadNotificationsByUserIdAsync(int userId)
        {
            return await _notificationRepository.GetUnreadByUserIdAsync(userId);
        }

        public async Task<bool> MarkNotificationAsReadAsync(int notificationId)
        {
            var notification = await _notificationRepository.GetByIdAsync(notificationId);
            if (notification == null)
                return false;

            notification.Read = true;
            return await _notificationRepository.UpdateAsync(notification);
        }

        public async Task<bool> CreateNotificationAsync(Notification notification)
        {
            notification.CreatedAt = DateTime.UtcNow;
            notification.Read = false;
            
            var id = await _notificationRepository.CreateAsync(notification);
            return id > 0;
        }

        public async Task<bool> SendEmailAsync(string recipient, string subject, string htmlContent)
        {
            try
            {
                var smtpServer = _configuration["Email:SmtpServer"];
                var smtpPort = int.Parse(_configuration["Email:SmtpPort"]);
                var smtpUsername = _configuration["Email:Username"];
                var smtpPassword = _configuration["Email:Password"];
                var sender = _configuration["Email:SenderEmail"];
                var senderName = _configuration["Email:SenderName"];

                var client = new SmtpClient(smtpServer)
                {
                    Port = smtpPort,
                    Credentials = new NetworkCredential(smtpUsername, smtpPassword),
                    EnableSsl = true,
                };

                var message = new MailMessage
                {
                    From = new MailAddress(sender, senderName),
                    Subject = subject,
                    Body = htmlContent,
                    IsBodyHtml = true
                };
                
                message.To.Add(recipient);
                
                await client.SendMailAsync(message);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending email to {Recipient}", recipient);
                return false;
            }
        }

        public async Task<bool> SendShiftChangeRequestEmailAsync(User recipient, User requester, DateTime date, ShiftType currentShift, ShiftType requestedShift)
        {
            // Create email content
            var subject = $"Shift Change Request - {date:yyyy-MM-dd}";
            var builder = new StringBuilder();
            builder.AppendLine("<html><body>");
            builder.AppendLine("<h2>Shift Change Request</h2>");
            builder.AppendLine($"<p>Hello {recipient.FirstName},</p>");
            builder.AppendLine($"<p>{requester.FirstName} {requester.LastName} has requested a shift change:</p>");
            builder.AppendLine("<ul>");
            builder.AppendLine($"<li><strong>Date:</strong> {date:yyyy-MM-dd}</li>");
            builder.AppendLine($"<li><strong>Current Shift:</strong> {GetShiftName(currentShift)}</li>");
            builder.AppendLine($"<li><strong>Requested Shift:</strong> {GetShiftName(requestedShift)}</li>");
            builder.AppendLine("</ul>");
            builder.AppendLine("<p>Please login to the system to approve or reject this request.</p>");
            builder.AppendLine("<p>Thank you,<br>Nurse Scheduler Team</p>");
            builder.AppendLine("</body></html>");

            return await SendEmailAsync(recipient.Email, subject, builder.ToString());
        }

        public async Task<bool> SendScheduleEmailAsync(User recipient, DateTime startDate, DateTime endDate, Role staffType, byte[] pdfAttachment)
        {
            var staffTypeStr = staffType.ToString();
            var subject = $"Schedule for {staffTypeStr} - {startDate:yyyy-MM-dd} to {endDate:yyyy-MM-dd}";
            
            var builder = new StringBuilder();
            builder.AppendLine("<html><body>");
            builder.AppendLine($"<h2>Schedule for {staffTypeStr}</h2>");
            builder.AppendLine($"<p>Hello {recipient.FirstName},</p>");
            builder.AppendLine($"<p>The schedule for {startDate:yyyy-MM-dd} to {endDate:yyyy-MM-dd} has been generated.</p>");
            builder.AppendLine("<p>Please find attached the PDF version of the schedule.</p>");
            builder.AppendLine("<p>You can also view the schedule in the Nurse Scheduler application.</p>");
            builder.AppendLine("<p>Thank you,<br>Nurse Scheduler Team</p>");
            builder.AppendLine("</body></html>");

            try
            {
                var smtpServer = _configuration["Email:SmtpServer"];
                var smtpPort = int.Parse(_configuration["Email:SmtpPort"]);
                var smtpUsername = _configuration["Email:Username"];
                var smtpPassword = _configuration["Email:Password"];
                var sender = _configuration["Email:SenderEmail"];
                var senderName = _configuration["Email:SenderName"];

                var client = new SmtpClient(smtpServer)
                {
                    Port = smtpPort,
                    Credentials = new NetworkCredential(smtpUsername, smtpPassword),
                    EnableSsl = true,
                };

                var message = new MailMessage
                {
                    From = new MailAddress(sender, senderName),
                    Subject = subject,
                    Body = builder.ToString(),
                    IsBodyHtml = true
                };
                
                message.To.Add(recipient.Email);
                
                // Add the PDF attachment
                var ms = new MemoryStream(pdfAttachment);
                var attachment = new Attachment(ms, $"Schedule_{startDate:yyyyMMdd}_{endDate:yyyyMMdd}.pdf", "application/pdf");
                message.Attachments.Add(attachment);
                
                await client.SendMailAsync(message);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending schedule email to {Recipient}", recipient.Email);
                return false;
            }
        }

        public async Task<bool> SendChangeRequestStatusEmailAsync(User recipient, RequestStatus status, DateTime date, ShiftType shiftType)
        {
            var statusStr = status.ToString().ToUpper();
            var subject = $"Shift Change Request {statusStr} - {date:yyyy-MM-dd}";
            
            var builder = new StringBuilder();
            builder.AppendLine("<html><body>");
            builder.AppendLine($"<h2>Shift Change Request {statusStr}</h2>");
            builder.AppendLine($"<p>Hello {recipient.FirstName},</p>");
            
            if (status == RequestStatus.Approved)
            {
                builder.AppendLine($"<p>Your shift change request for {date:yyyy-MM-dd} ({GetShiftName(shiftType)}) has been <strong style='color:green'>APPROVED</strong>.</p>");
                builder.AppendLine("<p>The schedule has been updated accordingly.</p>");
            }
            else
            {
                builder.AppendLine($"<p>Your shift change request for {date:yyyy-MM-dd} ({GetShiftName(shiftType)}) has been <strong style='color:red'>REJECTED</strong>.</p>");
                builder.AppendLine("<p>Please contact your head nurse for more information.</p>");
            }
            
            builder.AppendLine("<p>Thank you,<br>Nurse Scheduler Team</p>");
            builder.AppendLine("</body></html>");

            return await SendEmailAsync(recipient.Email, subject, builder.ToString());
        }

        public async Task<bool> SendPushNotificationAsync(string userId, string title, string message, Dictionary<string, string> data)
        {
            // In a real implementation, this would integrate with Firebase Cloud Messaging or 
            // another push notification service. For now, we'll just log the notification.
            _logger.LogInformation("Push notification to {UserId}: {Title} - {Message}", userId, title, message);
            
            // Create a notification record in the database
            var notification = new Notification
            {
                UserId = int.Parse(userId),
                Title = title,
                Message = message,
                CreatedAt = DateTime.UtcNow,
                Read = false
            };
            
            await _notificationRepository.CreateAsync(notification);
            
            // In a real implementation, we would send the notification via FCM here
            return true;
        }

        private string GetShiftName(ShiftType shiftType)
        {
            return shiftType switch
            {
                ShiftType.Morning => "Morning Shift (07:00-15:00)",
                ShiftType.Afternoon => "Afternoon Shift (15:00-23:00)",
                ShiftType.Night => "Night Shift (23:00-07:00)",
                ShiftType.Rest => "Rest Day",
                ShiftType.Holiday => "Holiday",
                _ => shiftType.ToString()
            };
        }
    }
}
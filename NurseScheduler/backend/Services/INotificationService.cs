using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using NurseScheduler.Models;

namespace NurseScheduler.Services
{
    public interface INotificationService
    {
        Task<IEnumerable<Notification>> GetNotificationsByUserIdAsync(int userId);
        Task<IEnumerable<Notification>> GetUnreadNotificationsByUserIdAsync(int userId);
        Task<bool> MarkNotificationAsReadAsync(int notificationId);
        Task<bool> CreateNotificationAsync(Notification notification);
        Task<bool> SendEmailAsync(string recipient, string subject, string htmlContent);
        Task<bool> SendShiftChangeRequestEmailAsync(User recipient, User requester, DateTime date, ShiftType currentShift, ShiftType requestedShift);
        Task<bool> SendScheduleEmailAsync(User recipient, DateTime startDate, DateTime endDate, Role staffType, byte[] pdfAttachment);
        Task<bool> SendChangeRequestStatusEmailAsync(User recipient, RequestStatus status, DateTime date, ShiftType shiftType);
        Task<bool> SendPushNotificationAsync(string userId, string title, string message, Dictionary<string, string> data);
    }
}
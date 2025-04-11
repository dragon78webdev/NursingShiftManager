using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NurseSchedulerAPI.Models
{
    public class User
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? GoogleId { get; set; }
        public string? Role { get; set; }
        public string? ProfilePicture { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Relazioni di navigazione
        public Staff? Staff { get; set; }
        public List<Notification>? Notifications { get; set; }
    }

    public class Staff
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string? Department { get; set; }
        public int WorkingPercentage { get; set; } = 100;
        public int YearsOfExperience { get; set; } = 0;
        public bool AvailableForExtraShifts { get; set; } = false;
        public string? EmergencyContact { get; set; }

        // Relazioni di navigazione
        public User? User { get; set; }
        public List<Shift>? Shifts { get; set; }
        public List<Vacation>? Vacations { get; set; }
        public List<ChangeRequest>? ChangeRequests { get; set; }
        public List<Delegation>? HeadNurseDelegations { get; set; }
        public List<Delegation>? DelegatedToDelegations { get; set; }
    }

    public class Shift
    {
        public int Id { get; set; }
        public int StaffId { get; set; }
        public DateTime Date { get; set; }
        public string ShiftType { get; set; } = string.Empty;
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        // Relazioni di navigazione
        public Staff? Staff { get; set; }
        public List<ChangeRequest>? ChangeRequests { get; set; }
    }

    public class Vacation
    {
        public int Id { get; set; }
        public int StaffId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string? Reason { get; set; }
        public bool? Approved { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Relazioni di navigazione
        public Staff? Staff { get; set; }
    }

    public class ChangeRequest
    {
        public int Id { get; set; }
        public int StaffId { get; set; }
        public int ShiftId { get; set; }
        public string RequestType { get; set; } = string.Empty;
        public string? ProposedShiftType { get; set; }
        public DateTime? ProposedDate { get; set; }
        public string? Reason { get; set; }
        public string Status { get; set; } = "pending";
        public int? HandledById { get; set; }
        public DateTime? HandledAt { get; set; }
        public string? RejectionReason { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }

        // Relazioni di navigazione
        public Staff? Staff { get; set; }
        public Shift? Shift { get; set; }
        public User? HandledBy { get; set; }
    }

    public class Delegation
    {
        public int Id { get; set; }
        public int HeadNurseId { get; set; }
        public int DelegatedToId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string? Reason { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Relazioni di navigazione
        public Staff? HeadNurse { get; set; }
        public Staff? DelegatedTo { get; set; }
    }

    public class Notification
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string? Type { get; set; }
        public string? Link { get; set; }
        public bool Read { get; set; } = false;
        public DateTime? ReadAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Relazioni di navigazione
        public User? User { get; set; }
    }

    public class ScheduleGeneration
    {
        public int Id { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string StaffType { get; set; } = string.Empty;
        public int GeneratedById { get; set; }
        public string? Parameters { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Relazioni di navigazione
        public User? GeneratedBy { get; set; }
    }

    public class PushSubscription
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string Endpoint { get; set; } = string.Empty;
        public string P256dh { get; set; } = string.Empty;
        public string Auth { get; set; } = string.Empty;
        public string? DeviceName { get; set; }
        public string? DeviceType { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? LastUsedAt { get; set; }

        // Relazioni di navigazione
        public User? User { get; set; }
    }
}
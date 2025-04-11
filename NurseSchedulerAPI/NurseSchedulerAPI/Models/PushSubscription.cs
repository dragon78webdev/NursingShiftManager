using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NurseSchedulerAPI.Models
{
    /// <summary>
    /// Rappresenta una sottoscrizione push per le notifiche sul dispositivo di un utente
    /// </summary>
    public class PushSubscription
    {
        [Key]
        public int Id { get; set; }
        
        [ForeignKey("User")]
        public int UserId { get; set; }
        
        [Required]
        public string Endpoint { get; set; } = string.Empty;
        
        [Required]
        public string P256dh { get; set; } = string.Empty;
        
        [Required]
        public string Auth { get; set; } = string.Empty;
        
        public string? DeviceName { get; set; }
        
        public string? DeviceType { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? LastUsedAt { get; set; }
        
        // Relazioni di navigazione
        public virtual User? User { get; set; }
    }
}
using System.ComponentModel.DataAnnotations;

namespace NurseSchedulerAPI.Models
{
    /// <summary>
    /// Rappresenta un utente nel sistema
    /// </summary>
    public class User
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        [EmailAddress]
        [StringLength(100)]
        public string Email { get; set; } = string.Empty;
        
        [StringLength(255)]
        public string? GoogleId { get; set; }
        
        [Required]
        public Role Role { get; set; }
        
        public string? PictureUrl { get; set; }
        
        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public bool IsActive { get; set; } = true;
        
        // Relazioni di navigazione
        public virtual Staff? Staff { get; set; }
        public virtual ICollection<Notification> Notifications { get; set; } = new List<Notification>();
    }
}
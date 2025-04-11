using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NurseSchedulerAPI.Models
{
    /// <summary>
    /// Rappresenta una notifica inviata ad un utente
    /// </summary>
    public class Notification
    {
        [Key]
        public int Id { get; set; }
        
        [ForeignKey("User")]
        public int UserId { get; set; }
        
        [Required]
        [StringLength(100)]
        public string Title { get; set; } = string.Empty;
        
        [Required]
        [StringLength(500)]
        public string Message { get; set; } = string.Empty;
        
        // Tipo di notifica (es. informazione, avviso, errore)
        [StringLength(50)]
        public string Type { get; set; } = "Info";
        
        // Link facoltativo a cui la notifica può reindirizzare
        [StringLength(255)]
        public string? Link { get; set; }
        
        // Indica se la notifica è stata letta
        public bool Read { get; set; } = false;
        
        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? ReadAt { get; set; }
        
        // Relazioni di navigazione
        public virtual User? User { get; set; }
    }
}
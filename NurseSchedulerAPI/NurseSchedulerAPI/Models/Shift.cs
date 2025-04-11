using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NurseSchedulerAPI.Models
{
    /// <summary>
    /// Rappresenta un turno assegnato ad un membro del personale
    /// </summary>
    public class Shift
    {
        [Key]
        public int Id { get; set; }
        
        [ForeignKey("Staff")]
        public int StaffId { get; set; }
        
        [Required]
        [DataType(DataType.Date)]
        public DateTime Date { get; set; }
        
        [Required]
        public ShiftType ShiftType { get; set; }
        
        // Indica se il turno è stato assegnato manualmente (es. caposala) o tramite algoritmo
        public bool IsManuallyAssigned { get; set; } = false;
        
        // Note sul turno
        [StringLength(500)]
        public string? Notes { get; set; }
        
        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        [Required]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        
        // Relazioni di navigazione
        public virtual Staff? Staff { get; set; }
        public virtual ICollection<ChangeRequest> ChangeRequests { get; set; } = new List<ChangeRequest>();
        
        [NotMapped]
        public TimeSpan Duration
        {
            get
            {
                return ShiftType switch
                {
                    ShiftType.Morning => TimeSpan.FromHours(8),    // 6:00 - 14:00
                    ShiftType.Afternoon => TimeSpan.FromHours(8),  // 14:00 - 22:00
                    ShiftType.Night => TimeSpan.FromHours(8),      // 22:00 - 6:00
                    _ => TimeSpan.Zero
                };
            }
        }
    }
}
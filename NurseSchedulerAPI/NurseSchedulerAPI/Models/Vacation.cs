using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NurseSchedulerAPI.Models
{
    /// <summary>
    /// Rappresenta un periodo di ferie richiesto da un membro del personale
    /// </summary>
    public class Vacation
    {
        [Key]
        public int Id { get; set; }
        
        [ForeignKey("Staff")]
        public int StaffId { get; set; }
        
        [Required]
        [DataType(DataType.Date)]
        public DateTime StartDate { get; set; }
        
        [Required]
        [DataType(DataType.Date)]
        public DateTime EndDate { get; set; }
        
        // Indica se la richiesta di ferie è stata approvata
        public bool? Approved { get; set; }
        
        // Motivo della richiesta
        [StringLength(500)]
        public string? Reason { get; set; }
        
        // Commenti sulla decisione (approvata o rifiutata)
        [StringLength(500)]
        public string? Comments { get; set; }
        
        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Relazioni di navigazione
        public virtual Staff? Staff { get; set; }
        
        [NotMapped]
        public string? StaffName => Staff?.Name;
        
        [NotMapped]
        public int DurationDays => (EndDate - StartDate).Days + 1;
    }
}
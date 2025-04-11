using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NurseSchedulerAPI.Models
{
    /// <summary>
    /// Rappresenta una richiesta di cambio turno
    /// </summary>
    public class ChangeRequest
    {
        [Key]
        public int Id { get; set; }
        
        [ForeignKey("Staff")]
        public int StaffId { get; set; }
        
        [ForeignKey("Shift")]
        public int ShiftId { get; set; }
        
        [Required]
        public ShiftType RequestedShiftType { get; set; }
        
        [Required]
        [StringLength(500)]
        public string Reason { get; set; } = string.Empty;
        
        // Stato della richiesta (in attesa, approvata, rifiutata)
        [Required]
        public RequestStatus Status { get; set; } = RequestStatus.Pending;
        
        // Commenti da parte di chi approva/respinge
        [StringLength(500)]
        public string? Comments { get; set; }
        
        // Chi ha gestito la richiesta
        [ForeignKey("HandledBy")]
        public int? HandledById { get; set; }
        
        [Required]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? UpdatedAt { get; set; }
        
        // Relazioni di navigazione
        public virtual Staff? Staff { get; set; }
        public virtual Shift? Shift { get; set; }
        public virtual Staff? HandledBy { get; set; }
        
        [NotMapped]
        public string? StaffName => Staff?.Name;
        
        [NotMapped]
        public DateTime? ShiftDate => Shift?.Date;
        
        [NotMapped]
        public ShiftType? CurrentShiftType => Shift?.ShiftType;
    }
}
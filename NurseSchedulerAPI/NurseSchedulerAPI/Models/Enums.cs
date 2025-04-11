namespace NurseSchedulerAPI.Models
{
    /// <summary>
    /// Ruoli utente nel sistema
    /// </summary>
    public enum Role
    {
        Nurse,
        OSS,
        HeadNurse
    }

    /// <summary>
    /// Tipi di turno disponibili
    /// </summary>
    public enum ShiftType
    {
        Morning,
        Afternoon,
        Night,
        Rest,
        Vacation
    }

    /// <summary>
    /// Stati delle richieste di cambio turno
    /// </summary>
    public enum RequestStatus
    {
        Pending,
        Approved,
        Rejected
    }
}
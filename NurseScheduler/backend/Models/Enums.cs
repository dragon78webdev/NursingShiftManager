namespace NurseScheduler.Models
{
    public enum Role
    {
        Nurse,
        Oss,
        HeadNurse
    }

    public enum ShiftType
    {
        Morning,    // M = Mattino (7-15)
        Afternoon,  // P = Pomeriggio (15-23)
        Night,      // N = Notte (23-7)
        Rest,       // R = Riposo
        Holiday     // F = Festivo
    }

    public enum RequestStatus
    {
        Pending,
        Approved,
        Rejected
    }
}
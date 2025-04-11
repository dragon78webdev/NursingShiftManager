using System.Data;
using Microsoft.Data.SqlClient;

namespace NurseSchedulerAPI.Data
{
    public class DapperContext
    {
        private readonly string _connectionString;
        private readonly ILogger<DapperContext> _logger;

        public DapperContext(IConfiguration configuration, ILogger<DapperContext> logger)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection") ?? 
                throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");
            _logger = logger;
        }

        public IDbConnection CreateConnection()
        {
            _logger.LogDebug("Creating new SQL connection");
            return new SqlConnection(_connectionString);
        }

        /// <summary>
        /// Inizializza il database con le tabelle necessarie se non esistono
        /// </summary>
        public async Task InitializeDatabaseAsync()
        {
            try
            {
                _logger.LogInformation("Inizializzazione del database...");
                
                using var connection = CreateConnection();
                // Apre la connessione
                await connection.OpenAsync();

                // Crea le tabelle se non esistono
                await CreateTablesAsync(connection);

                _logger.LogInformation("Inizializzazione del database completata con successo");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Errore durante l'inizializzazione del database");
                throw;
            }
        }

        /// <summary>
        /// Crea le tabelle del database se non esistono
        /// </summary>
        private async Task CreateTablesAsync(IDbConnection connection)
        {
            _logger.LogDebug("Verifica e creazione delle tabelle...");
            
            // Script SQL per creare le tabelle se non esistono
            var createTablesSql = @"
                -- Crea la tabella Users se non esiste
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
                BEGIN
                    CREATE TABLE Users (
                        Id INT IDENTITY(1,1) PRIMARY KEY,
                        Name NVARCHAR(100) NOT NULL,
                        Email NVARCHAR(100) NOT NULL,
                        GoogleId NVARCHAR(100) NULL,
                        Role NVARCHAR(20) NULL,
                        ProfilePicture NVARCHAR(255) NULL,
                        IsActive BIT NOT NULL DEFAULT 1,
                        CreatedAt DATETIME NOT NULL DEFAULT GETUTCDATE()
                    );
                    CREATE UNIQUE INDEX IX_Users_Email ON Users(Email);
                    CREATE UNIQUE INDEX IX_Users_GoogleId ON Users(GoogleId) WHERE GoogleId IS NOT NULL;
                END

                -- Crea la tabella Staff se non esiste
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Staff')
                BEGIN
                    CREATE TABLE Staff (
                        Id INT IDENTITY(1,1) PRIMARY KEY,
                        UserId INT NOT NULL,
                        Name NVARCHAR(100) NOT NULL,
                        Role NVARCHAR(20) NOT NULL,
                        Department NVARCHAR(100) NULL,
                        WorkingPercentage INT NOT NULL DEFAULT 100,
                        YearsOfExperience INT NOT NULL DEFAULT 0,
                        AvailableForExtraShifts BIT NOT NULL DEFAULT 0,
                        EmergencyContact NVARCHAR(255) NULL,
                        CONSTRAINT FK_Staff_Users FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
                    );
                END

                -- Crea la tabella Shifts se non esiste
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Shifts')
                BEGIN
                    CREATE TABLE Shifts (
                        Id INT IDENTITY(1,1) PRIMARY KEY,
                        StaffId INT NOT NULL,
                        ShiftDate DATE NOT NULL,
                        ShiftType NVARCHAR(10) NOT NULL,
                        Notes NVARCHAR(MAX) NULL,
                        CreatedAt DATETIME NOT NULL DEFAULT GETUTCDATE(),
                        UpdatedAt DATETIME NULL,
                        CONSTRAINT FK_Shifts_Staff FOREIGN KEY (StaffId) REFERENCES Staff(Id),
                        CONSTRAINT UQ_Shifts_StaffId_ShiftDate UNIQUE (StaffId, ShiftDate)
                    );
                END

                -- Crea la tabella Vacations se non esiste
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Vacations')
                BEGIN
                    CREATE TABLE Vacations (
                        Id INT IDENTITY(1,1) PRIMARY KEY,
                        StaffId INT NOT NULL,
                        StartDate DATE NOT NULL,
                        EndDate DATE NOT NULL,
                        Reason NVARCHAR(255) NULL,
                        Approved BIT NULL,
                        CreatedAt DATETIME NOT NULL DEFAULT GETUTCDATE(),
                        CONSTRAINT FK_Vacations_Staff FOREIGN KEY (StaffId) REFERENCES Staff(Id) ON DELETE CASCADE
                    );
                END

                -- Crea la tabella ChangeRequests se non esiste
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ChangeRequests')
                BEGIN
                    CREATE TABLE ChangeRequests (
                        Id INT IDENTITY(1,1) PRIMARY KEY,
                        StaffId INT NOT NULL,
                        ShiftId INT NOT NULL,
                        RequestType NVARCHAR(20) NOT NULL,
                        ProposedShiftType NVARCHAR(10) NULL,
                        ProposedDate DATE NULL,
                        Reason NVARCHAR(255) NULL,
                        Status NVARCHAR(20) NOT NULL DEFAULT 'pending',
                        HandledById INT NULL,
                        HandledAt DATETIME NULL,
                        RejectionReason NVARCHAR(255) NULL,
                        CreatedAt DATETIME NOT NULL DEFAULT GETUTCDATE(),
                        UpdatedAt DATETIME NULL,
                        CONSTRAINT FK_ChangeRequests_Staff FOREIGN KEY (StaffId) REFERENCES Staff(Id) ON DELETE CASCADE,
                        CONSTRAINT FK_ChangeRequests_Shifts FOREIGN KEY (ShiftId) REFERENCES Shifts(Id),
                        CONSTRAINT FK_ChangeRequests_HandledBy FOREIGN KEY (HandledById) REFERENCES Users(Id)
                    );
                END

                -- Crea la tabella Delegations se non esiste
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Delegations')
                BEGIN
                    CREATE TABLE Delegations (
                        Id INT IDENTITY(1,1) PRIMARY KEY,
                        HeadNurseId INT NOT NULL,
                        DelegatedToId INT NOT NULL,
                        StartDate DATE NOT NULL,
                        EndDate DATE NOT NULL,
                        Reason NVARCHAR(255) NULL,
                        CreatedAt DATETIME NOT NULL DEFAULT GETUTCDATE(),
                        CONSTRAINT FK_Delegations_HeadNurse FOREIGN KEY (HeadNurseId) REFERENCES Staff(Id),
                        CONSTRAINT FK_Delegations_DelegatedTo FOREIGN KEY (DelegatedToId) REFERENCES Staff(Id)
                    );
                END

                -- Crea la tabella Notifications se non esiste
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Notifications')
                BEGIN
                    CREATE TABLE Notifications (
                        Id INT IDENTITY(1,1) PRIMARY KEY,
                        UserId INT NOT NULL,
                        Title NVARCHAR(100) NOT NULL,
                        Message NVARCHAR(255) NOT NULL,
                        Type NVARCHAR(20) NULL,
                        Link NVARCHAR(255) NULL,
                        Read BIT NOT NULL DEFAULT 0,
                        ReadAt DATETIME NULL,
                        CreatedAt DATETIME NOT NULL DEFAULT GETUTCDATE(),
                        CONSTRAINT FK_Notifications_Users FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
                    );
                END

                -- Crea la tabella ScheduleGenerations se non esiste
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ScheduleGenerations')
                BEGIN
                    CREATE TABLE ScheduleGenerations (
                        Id INT IDENTITY(1,1) PRIMARY KEY,
                        StartDate DATE NOT NULL,
                        EndDate DATE NOT NULL,
                        StaffType NVARCHAR(20) NOT NULL,
                        GeneratedById INT NOT NULL,
                        Parameters NVARCHAR(MAX) NULL,
                        CreatedAt DATETIME NOT NULL DEFAULT GETUTCDATE(),
                        CONSTRAINT FK_ScheduleGenerations_Users FOREIGN KEY (GeneratedById) REFERENCES Users(Id)
                    );
                END

                -- Crea la tabella PushSubscriptions se non esiste
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PushSubscriptions')
                BEGIN
                    CREATE TABLE PushSubscriptions (
                        Id INT IDENTITY(1,1) PRIMARY KEY,
                        UserId INT NOT NULL,
                        Endpoint NVARCHAR(500) NOT NULL,
                        P256dh NVARCHAR(500) NOT NULL,
                        Auth NVARCHAR(500) NOT NULL,
                        DeviceName NVARCHAR(100) NULL,
                        DeviceType NVARCHAR(50) NULL,
                        CreatedAt DATETIME NOT NULL DEFAULT GETUTCDATE(),
                        LastUsedAt DATETIME NULL,
                        CONSTRAINT FK_PushSubscriptions_Users FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
                    );
                END
            ";

            // Esegue lo script SQL
            using var command = connection.CreateCommand();
            command.CommandText = createTablesSql;
            command.CommandType = CommandType.Text;
            
            await command.ExecuteNonQueryAsync();
            
            _logger.LogDebug("Creazione delle tabelle completata");
        }
    }
}
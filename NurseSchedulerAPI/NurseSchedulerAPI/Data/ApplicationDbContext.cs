using Microsoft.EntityFrameworkCore;
using NurseSchedulerAPI.Models;

namespace NurseSchedulerAPI.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users { get; set; } = null!;
        public DbSet<Staff> Staff { get; set; } = null!;
        public DbSet<Shift> Shifts { get; set; } = null!;
        public DbSet<Vacation> Vacations { get; set; } = null!;
        public DbSet<ChangeRequest> ChangeRequests { get; set; } = null!;
        public DbSet<Delegation> Delegations { get; set; } = null!;
        public DbSet<Notification> Notifications { get; set; } = null!;
        public DbSet<ScheduleGeneration> ScheduleGenerations { get; set; } = null!;
        public DbSet<PushSubscription> PushSubscriptions { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configurazione delle relazioni one-to-one
            modelBuilder.Entity<User>()
                .HasOne(u => u.Staff)
                .WithOne(s => s.User)
                .HasForeignKey<Staff>(s => s.UserId);

            // Configurazione delle relazioni one-to-many
            modelBuilder.Entity<Staff>()
                .HasMany(s => s.Shifts)
                .WithOne(sh => sh.Staff)
                .HasForeignKey(sh => sh.StaffId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Staff>()
                .HasMany(s => s.Vacations)
                .WithOne(v => v.Staff)
                .HasForeignKey(v => v.StaffId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Staff>()
                .HasMany(s => s.ChangeRequests)
                .WithOne(cr => cr.Staff)
                .HasForeignKey(cr => cr.StaffId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Shift>()
                .HasMany(sh => sh.ChangeRequests)
                .WithOne(cr => cr.Shift)
                .HasForeignKey(cr => cr.ShiftId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<User>()
                .HasMany(u => u.Notifications)
                .WithOne(n => n.User)
                .HasForeignKey(n => n.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configurazione delle relazioni per le deleghe
            modelBuilder.Entity<Delegation>()
                .HasOne(d => d.HeadNurse)
                .WithMany(s => s.HeadNurseDelegations)
                .HasForeignKey(d => d.HeadNurseId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Delegation>()
                .HasOne(d => d.DelegatedTo)
                .WithMany(s => s.DelegatedToDelegations)
                .HasForeignKey(d => d.DelegatedToId)
                .OnDelete(DeleteBehavior.Restrict);

            // Configurazione per l'entità ChangeRequest e il suo campo HandledBy
            modelBuilder.Entity<ChangeRequest>()
                .HasOne(cr => cr.HandledBy)
                .WithMany()
                .HasForeignKey(cr => cr.HandledById)
                .OnDelete(DeleteBehavior.Restrict);

            // Configurazione per l'entità ScheduleGeneration
            modelBuilder.Entity<ScheduleGeneration>()
                .HasOne(sg => sg.GeneratedBy)
                .WithMany()
                .HasForeignKey(sg => sg.GeneratedById)
                .OnDelete(DeleteBehavior.Restrict);

            // Configurazione degli indici
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            modelBuilder.Entity<User>()
                .HasIndex(u => u.GoogleId)
                .IsUnique()
                .HasFilter("[GoogleId] IS NOT NULL");

            modelBuilder.Entity<Shift>()
                .HasIndex(sh => new { sh.StaffId, sh.Date })
                .IsUnique();

            // Configurazione dei nomi delle tabelle
            modelBuilder.Entity<User>().ToTable("Users");
            modelBuilder.Entity<Staff>().ToTable("Staff");
            modelBuilder.Entity<Shift>().ToTable("Shifts");
            modelBuilder.Entity<Vacation>().ToTable("Vacations");
            modelBuilder.Entity<ChangeRequest>().ToTable("ChangeRequests");
            modelBuilder.Entity<Delegation>().ToTable("Delegations");
            modelBuilder.Entity<Notification>().ToTable("Notifications");
            modelBuilder.Entity<ScheduleGeneration>().ToTable("ScheduleGenerations");
            modelBuilder.Entity<PushSubscription>().ToTable("PushSubscriptions");
        }
    }
}
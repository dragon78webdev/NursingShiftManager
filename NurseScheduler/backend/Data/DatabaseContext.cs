using System.Data;
using System.Data.SqlClient;
using Microsoft.Extensions.Configuration;

namespace NurseScheduler.Data
{
    public interface IDatabaseContext
    {
        IDbConnection CreateConnection();
    }

    public class DatabaseContext : IDatabaseContext
    {
        private readonly IConfiguration _configuration;

        public DatabaseContext(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public IDbConnection CreateConnection()
        {
            return new SqlConnection(_configuration.GetConnectionString("DefaultConnection"));
        }
    }
}
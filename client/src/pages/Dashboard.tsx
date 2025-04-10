import { Link } from "wouter";
import { User, CalendarDays, UserPlus, Repeat2, Umbrella } from "lucide-react";

interface DashboardProps {
  userRole?: string;
}

const Dashboard = ({ userRole = "nurse" }: DashboardProps) => {
  console.log("Rendering Dashboard component, user role:", userRole);
  
  // Simple static dashboard for testing
  return (
    <div className="space-y-6 py-6 px-4">
      <div>
        <h1 className="text-2xl font-bold text-neutral-800">Dashboard</h1>
        <p className="text-neutral-600">Benvenuto nel sistema di gestione turni</p>
      </div>
      
      {/* Stats Overview - Simplified for testing */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: <User />, title: "Infermieri", value: 24, color: "bg-blue-100" },
          { icon: <UserPlus />, title: "OSS", value: 12, color: "bg-green-100" },
          { icon: <Repeat2 />, title: "Richieste Cambio", value: 5, color: "bg-yellow-100" },
          { icon: <Umbrella />, title: "Personale in ferie", value: 3, color: "bg-purple-100" }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="mt-1 text-2xl font-semibold">{stat.value}</p>
              </div>
              <div className={`p-2 rounded-full ${stat.color}`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold mb-4">Navigazione Rapida</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/schedule" className="flex items-center p-3 border rounded-md hover:bg-gray-50">
            <CalendarDays className="mr-2 h-5 w-5 text-primary" />
            <span>Visualizza Turni</span>
          </Link>
          
          <Link href="/change-requests" className="flex items-center p-3 border rounded-md hover:bg-gray-50">
            <Repeat2 className="mr-2 h-5 w-5 text-yellow-600" />
            <span>Richieste Cambio</span>
          </Link>
          
          <Link href="/vacations" className="flex items-center p-3 border rounded-md hover:bg-gray-50">
            <Umbrella className="mr-2 h-5 w-5 text-purple-600" />
            <span>Gestione Ferie</span>
          </Link>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold mb-4">Informazioni di Sistema</h2>
        <p>Ambiente: {import.meta.env.MODE}</p>
        <p>Versione: 1.0.0</p>
        <p>Ruolo Utente: {userRole}</p>
        <p className="mt-4 text-sm text-gray-500">NurseScheduler - Sistema di gestione turni</p>
      </div>
    </div>
  );
};

export default Dashboard;

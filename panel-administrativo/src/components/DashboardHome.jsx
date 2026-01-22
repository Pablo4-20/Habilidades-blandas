import { useState, useEffect } from 'react';
import api from '../services/api';
import { 
    UserGroupIcon, AcademicCapIcon, BookOpenIcon, 
    ClipboardDocumentCheckIcon, ChartBarIcon, SparklesIcon,
    PresentationChartLineIcon, CheckBadgeIcon
} from '@heroicons/react/24/outline';

const DashboardHome = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/dashboard/stats');
                setStats(res.data);
            } catch (error) {
                console.error("Error cargando stats");
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    // Componente de Tarjeta Reutilizable
    const StatCard = ({ title, value, icon: Icon, color, subtext }) => (
        <div className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 ${color} transition transform hover:scale-105`}>
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{title}</p>
                    <h3 className="text-3xl font-bold text-gray-800 mt-2">{loading ? '-' : value}</h3>
                    {subtext && <p className="text-xs text-gray-500 mt-2">{subtext}</p>}
                </div>
                <div className={`p-3 rounded-xl bg-opacity-20 ${color.replace('border-l-', 'bg-').replace('500', '100')}`}>
                    <Icon className={`h-6 w-6 ${color.replace('border-l-', 'text-')}`} />
                </div>
            </div>
        </div>
    );

    // FUNCIÓN SEGURA PARA EL PORCENTAJE (CAP A 100%)
    const getSafePercentage = (val) => {
        if (!val) return 0;
        const num = parseFloat(val);
        return Math.min(num, 100); // Nunca devolverá más de 100
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* SALUDO DE BIENVENIDA */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold">¡Hola, {user?.nombres} {user?.apellidos}!</h1>
                    <p className="text-blue-100 mt-2 text-lg">
                        Bienvenido al panel de control de {user.rol === 'admin' ? 'Administración' : user.rol === 'coordinador' ? 'Coordinación' : 'Docencia'}.
                    </p>
                </div>
                {/* Decoración de fondo */}
                <div className="absolute right-0 top-0 h-full w-1/3 bg-white opacity-10 transform skew-x-12"></div>
                <div className="absolute right-10 bottom-[-20px] h-32 w-32 bg-blue-400 rounded-full opacity-20 blur-2xl"></div>
            </div>

            {/* SECCIÓN DE TARJETAS SEGÚN ROL */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* --- VISTA ADMINISTRADOR --- */}
                {user.rol === 'admin' && stats && (
                    <>
                        <StatCard 
                            title="Usuarios Totales" 
                            value={stats.usuarios} 
                            icon={UserGroupIcon} 
                            color="border-l-purple-500" 
                            subtext="Docentes y Administrativos"
                        />
                        <StatCard 
                            title="Estudiantes" 
                            value={stats.estudiantes} 
                            icon={AcademicCapIcon} 
                            color="border-l-blue-500" 
                            subtext="Registrados en el sistema"
                        />
                        <StatCard 
                            title="Materias" 
                            value={stats.asignaturas} 
                            icon={BookOpenIcon} 
                            color="border-l-green-500" 
                            subtext="Oferta académica actual"
                        />
                        <StatCard 
                            title="Habilidades" 
                            value={stats.habilidades} 
                            icon={SparklesIcon} 
                            color="border-l-yellow-500" 
                            subtext="Catálogo activo"
                        />
                    </>
                )}

                {/* --- VISTA COORDINADOR (AQUÍ ESTÁ EL CAMBIO) --- */}
                {user.rol === 'coordinador' && stats && (
                    <>
                        <StatCard 
                            title="Cargas Asignadas" 
                            value={stats.asignaciones} 
                            icon={BookOpenIcon} 
                            color="border-l-blue-500" 
                            subtext="Materias con docente asignado"
                        />
                        <StatCard 
                            title="Planificaciones" 
                            value={stats.planificaciones} 
                            icon={ClipboardDocumentCheckIcon} 
                            color="border-l-purple-500" 
                            subtext="Habilidades definidas por docentes"
                        />
                        <StatCard 
                            title="Cumplimiento" 
                            // AQUI SE APLICA EL CORRECTOR
                            value={`${getSafePercentage(stats.cumplimiento)}%`} 
                            icon={PresentationChartLineIcon} 
                            color={getSafePercentage(stats.cumplimiento) > 80 ? "border-l-green-500" : "border-l-orange-500"} 
                            subtext="Avance de planificación docente"
                        />
                        <StatCard 
                            title="Reportes Finales" 
                            value={stats.reportes} 
                            icon={CheckBadgeIcon} 
                            color="border-l-red-500" 
                            subtext="Actas generadas"
                        />
                    </>
                )}

                {/* --- VISTA DOCENTE --- */}
                {user.rol === 'docente' && stats && (
                    <>
                        <StatCard 
                            title="Mis Materias" 
                            value={stats.mis_materias} 
                            icon={BookOpenIcon} 
                            color="border-l-blue-500" 
                            subtext="Carga académica actual"
                        />
                        <StatCard 
                            title="Mis Planificaciones" 
                            value={stats.mis_planes} 
                            icon={ClipboardDocumentCheckIcon} 
                            color="border-l-purple-500" 
                            subtext="Habilidades asignadas"
                        />
                        <StatCard 
                            title="Estudiantes" 
                            value={stats.mis_alumnos} 
                            icon={UserGroupIcon} 
                            color="border-l-green-500" 
                            subtext="Total aproximado en mis cursos"
                        />
                        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex flex-col justify-center items-center text-center">
                            <p className="text-sm text-blue-800 font-medium mb-2">¿Listo para evaluar?</p>
                            <a href="/dashboard/evaluacion" className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition">
                                Ir a Calificar
                            </a>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default DashboardHome;
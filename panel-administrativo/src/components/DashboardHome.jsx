import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
    UserGroupIcon, AcademicCapIcon, BookOpenIcon, 
    ClipboardDocumentCheckIcon, ChartBarIcon, SparklesIcon,
    PresentationChartLineIcon, CheckBadgeIcon, ClockIcon,
    CalendarDaysIcon, ArrowRightIcon, Cog6ToothIcon,
    DocumentChartBarIcon
} from '@heroicons/react/24/outline';

const DashboardHome = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [fecha, setFecha] = useState(new Date());

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Aquí se asume que el endpoint devuelve datos según el rol del usuario logueado
                const res = await api.get('/dashboard/stats');
                setStats(res.data);
            } catch (error) {
                console.error("Error cargando stats");
            } finally {
                setLoading(false);
            }
        };
        fetchStats();

        // Reloj en tiempo real
        const timer = setInterval(() => setFecha(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Formatos de fecha
    const fechaFormateada = fecha.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const horaFormateada = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    // --- COMPONENTES UI REUTILIZABLES ---

    // 1. Tarjeta de Estadística (KPI)
    const StatCard = ({ title, value, icon: Icon, color, subtext, trend }) => (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 group relative overflow-hidden">
            <div className={`absolute top-0 right-0 p-3 opacity-10 rounded-bl-2xl ${color.bg}`}>
                <Icon className={`h-12 w-12 ${color.text}`} />
            </div>
            <div className="flex flex-col relative z-10">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{title}</p>
                <h3 className="text-3xl font-black text-gray-800 mb-2">{loading ? '-' : value}</h3>
                {subtext && (
                    <div className="flex items-center gap-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${trend === 'good' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {subtext}
                        </span>
                    </div>
                )}
            </div>
            {/* Barra inferior de color */}
            <div className={`absolute bottom-0 left-0 h-1 w-full ${color.bgMain}`}></div>
        </div>
    );

    // 2. Tarjeta de Acción Rápida (Botón Grande)
    const ActionCard = ({ title, desc, icon: Icon, onClick, colorClass }) => (
        <button 
            onClick={onClick}
            className="w-full bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:border-blue-300 hover:shadow-md transition-all duration-300 text-left group flex items-center gap-4"
        >
            <div className={`p-3 rounded-xl ${colorClass} group-hover:scale-110 transition-transform`}>
                <Icon className="h-6 w-6 text-white"/>
            </div>
            <div className="flex-1">
                <h4 className="font-bold text-gray-800 text-sm group-hover:text-blue-600 transition-colors">{title}</h4>
                <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </div>
            <ArrowRightIcon className="h-4 w-4 text-gray-300 group-hover:text-blue-500 transform group-hover:translate-x-1 transition-all"/>
        </button>
    );

    // Helper
    const getSafePercentage = (val) => Math.min(parseFloat(val || 0), 100);

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            
            {/* --- HEADER COMÚN CON BIENVENIDA Y RELOJ --- */}
            <div className={`rounded-3xl p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6
                ${user.rol === 'admin' ? 'bg-gradient-to-r from-gray-800 to-gray-900' : 
                  user.rol === 'coordinador' ? 'bg-gradient-to-r from-purple-700 to-indigo-800' : 
                  'bg-gradient-to-r from-blue-600 to-indigo-600'}`}>
                
                {/* Decoración Fondo */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                
                <div className="relative z-10">
                    <div className="flex items-center gap-2 opacity-80 text-sm font-bold uppercase tracking-widest mb-1">
                        {user.rol === 'admin' && <><Cog6ToothIcon className="h-4 w-4"/> Administración</>}
                        {user.rol === 'coordinador' && <><PresentationChartLineIcon className="h-4 w-4"/> Coordinación</>}
                        {user.rol === 'docente' && <><AcademicCapIcon className="h-4 w-4"/> Docencia</>}
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold">Hola, {user?.nombres?.split(' ')[0]}</h1>
                    <p className="opacity-90 mt-1">Aquí tienes el resumen de hoy.</p>
                </div>

                <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 min-w-[160px] text-center relative z-10">
                    <ClockIcon className="h-6 w-6 mx-auto mb-1 opacity-80"/>
                    <p className="text-xl font-bold">{horaFormateada}</p>
                    <p className="text-[10px] uppercase tracking-wide opacity-80">{fechaFormateada}</p>
                </div>
            </div>

            {/* =================================================================================
                VISTA ADMINISTRADOR
               ================================================================================= */}
            {user.rol === 'admin' && stats && (
                <div className="space-y-8">
                    {/* KPIs Admin */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard 
                            title="Usuarios" value={stats.usuarios} icon={UserGroupIcon} 
                            color={{ bg: 'bg-blue-100', text: 'text-blue-600', bgMain: 'bg-blue-500' }} subtext="Activos en sistema"
                        />
                        <StatCard 
                            title="Estudiantes" value={stats.estudiantes} icon={AcademicCapIcon} 
                            color={{ bg: 'bg-green-100', text: 'text-green-600', bgMain: 'bg-green-500' }} subtext="Matriculados"
                        />
                        <StatCard 
                            title="Asignaturas" value={stats.asignaturas} icon={BookOpenIcon} 
                            color={{ bg: 'bg-purple-100', text: 'text-purple-600', bgMain: 'bg-purple-500' }} subtext="Total ofertado"
                        />
                        <StatCard 
                            title="Periodos" value={stats.periodos} icon={CalendarDaysIcon} 
                            color={{ bg: 'bg-orange-100', text: 'text-orange-600', bgMain: 'bg-orange-500' }} subtext="Gestión académica"
                        />
                    </div>

                    {/* Accesos Rápidos Admin */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <SparklesIcon className="h-5 w-5 text-yellow-500"/> Gestión Rápida
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <ActionCard 
                                title="Gestionar Usuarios" desc="Crear, editar o eliminar cuentas." 
                                icon={UserGroupIcon} colorClass="bg-blue-500" 
                                onClick={() => navigate('/usuarios')}
                            />
                            <ActionCard 
                                title="Periodos Académicos" desc="Abrir o cerrar ciclos lectivos." 
                                icon={CalendarDaysIcon} colorClass="bg-orange-500" 
                                onClick={() => navigate('/periodos')}
                            />
                            <ActionCard 
                                title="Catálogo Materias" desc="Administrar asignaturas y mallas." 
                                icon={BookOpenIcon} colorClass="bg-purple-500" 
                                onClick={() => navigate('/asignaturas')}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* =================================================================================
                VISTA COORDINADOR
               ================================================================================= */}
            {user.rol === 'coordinador' && stats && (
                <div className="space-y-8">
                    {/* KPIs Coordinador */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard 
                            title="Cargas Asignadas" value={stats.asignaciones} icon={BookOpenIcon} 
                            color={{ bg: 'bg-indigo-100', text: 'text-indigo-600', bgMain: 'bg-indigo-500' }} subtext="Docentes ubicados"
                        />
                        <StatCard 
                            title="Planificaciones" value={stats.planificaciones} icon={ClipboardDocumentCheckIcon} 
                            color={{ bg: 'bg-pink-100', text: 'text-pink-600', bgMain: 'bg-pink-500' }} subtext="Habilidades definidas"
                        />
                        <StatCard 
                            title="Cumplimiento" value={`${getSafePercentage(stats.cumplimiento)}%`} icon={PresentationChartLineIcon} 
                            color={{ bg: 'bg-teal-100', text: 'text-teal-600', bgMain: getSafePercentage(stats.cumplimiento) > 80 ? 'bg-teal-500' : 'bg-orange-500' }} 
                            subtext="Avance global" trend="good"
                        />
                        <StatCard 
                            title="Actas Generadas" value={stats.reportes} icon={CheckBadgeIcon} 
                            color={{ bg: 'bg-red-100', text: 'text-red-600', bgMain: 'bg-red-500' }} subtext="Cierres de ciclo"
                        />
                    </div>

                    {/* Accesos Rápidos Coordinador */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-800 mb-4">Acciones de Coordinación</h3>
                            <div className="space-y-3">
                                <ActionCard 
                                    title="Distribución de Carga" desc="Asignar materias a docentes." 
                                    icon={UserGroupIcon} colorClass="bg-indigo-600" 
                                    onClick={() => navigate('/asignaciones')}
                                />
                                <ActionCard 
                                    title="Monitor de Reportes" desc="Verificar cumplimiento docente." 
                                    icon={DocumentChartBarIcon} colorClass="bg-teal-600" 
                                    onClick={() => navigate('/reportes-coordinador')}
                                />
                            </div>
                        </div>
                        {/* Widget de Progreso Visual */}
                        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-6 rounded-2xl text-white shadow-md flex flex-col justify-center items-center text-center">
                            <ChartBarIcon className="h-12 w-12 mb-3 opacity-80"/>
                            <h3 className="text-2xl font-bold mb-1">Estado del Periodo</h3>
                            <p className="text-purple-200 text-sm mb-4">El avance general de planificación es del {getSafePercentage(stats.cumplimiento)}%</p>
                            <div className="w-full bg-black/20 rounded-full h-3 mb-2">
                                <div className="bg-white h-3 rounded-full transition-all duration-1000" style={{ width: `${getSafePercentage(stats.cumplimiento)}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* =================================================================================
                VISTA DOCENTE
               ================================================================================= */}
            {user.rol === 'docente' && stats && (
                <div className="space-y-8">
                    {/* KPIs Docente */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard 
                            title="Mis Materias" value={stats.mis_materias} icon={BookOpenIcon} 
                            color={{ bg: 'bg-blue-100', text: 'text-blue-600', bgMain: 'bg-blue-500' }} subtext="Carga actual"
                        />
                        <StatCard 
                            title="Planificadas" value={stats.mis_planes} icon={ClipboardDocumentCheckIcon} 
                            color={{ bg: 'bg-emerald-100', text: 'text-emerald-600', bgMain: 'bg-emerald-500' }} subtext="Habilidades activas"
                        />
                        <StatCard 
                            title="Estudiantes" value={stats.mis_alumnos} icon={UserGroupIcon} 
                            color={{ bg: 'bg-amber-100', text: 'text-amber-600', bgMain: 'bg-amber-500' }} subtext="Total en lista"
                        />
                    </div>

                    {/* Accesos Rápidos Docente */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <SparklesIcon className="h-5 w-5 text-blue-500"/> Tu Espacio de Trabajo
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <ActionCard 
                                title="Mis Cursos" desc="Ver listado y gestionar materias." 
                                icon={BookOpenIcon} colorClass="bg-blue-600" 
                                onClick={() => navigate('/docente/mis-cursos')}
                            />
                            <ActionCard 
                                title="Calificar Habilidades" desc="Registrar evaluaciones a estudiantes." 
                                icon={CheckBadgeIcon} colorClass="bg-emerald-600" 
                                onClick={() => navigate('/docente/evaluacion')}
                            />
                            <ActionCard 
                                title="Mis Reportes" desc="Generar actas y ver gráficas." 
                                icon={ChartBarIcon} colorClass="bg-rose-500" 
                                onClick={() => navigate('/docente/reportes')}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardHome;
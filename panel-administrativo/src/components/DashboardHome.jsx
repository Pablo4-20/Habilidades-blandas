import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
    UserGroupIcon, AcademicCapIcon, BookOpenIcon, 
    ClipboardDocumentCheckIcon, ChartBarIcon, SparklesIcon,
    PresentationChartLineIcon, CheckBadgeIcon, ClockIcon,
    CalendarDaysIcon, ArrowRightIcon, Cog6ToothIcon,
    DocumentChartBarIcon, UserPlusIcon, PencilSquareIcon,
    DocumentCheckIcon
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
                const res = await api.get('/dashboard/stats');
                setStats(res.data);
            } catch (error) {
                console.error("Error cargando stats");
            } finally {
                setLoading(false);
            }
        };
        fetchStats();

        const timer = setInterval(() => setFecha(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const fechaFormateada = fecha.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const horaFormateada = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    // --- COMPONENTES UI ---

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
            <div className={`absolute bottom-0 left-0 h-1 w-full ${color.bgMain}`}></div>
        </div>
    );

    const ActionCard = ({ title, desc, icon: Icon, onClick, colorClass }) => (
        <button onClick={onClick} className="w-full bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:border-blue-300 hover:shadow-md transition-all duration-300 text-left group flex items-center gap-4 h-full">
            <div className={`p-3 rounded-xl ${colorClass} group-hover:scale-110 transition-transform shadow-sm`}>
                <Icon className="h-6 w-6 text-white"/>
            </div>
            <div className="flex-1">
                <h4 className="font-bold text-gray-800 text-sm group-hover:text-blue-600 transition-colors">{title}</h4>
                <p className="text-xs text-gray-500 mt-0.5 leading-snug">{desc}</p>
            </div>
            <ArrowRightIcon className="h-4 w-4 text-gray-300 group-hover:text-blue-500 transform group-hover:translate-x-1 transition-all"/>
        </button>
    );

    // Gráfica Lineal SVG
    const SimpleLineChart = ({ percentage }) => {
        const points = `0,100 20,85 40,75 60,55 80,35 100,${100 - percentage}`; 
        return (
            <div className="relative h-full w-full overflow-hidden min-h-[120px]">
                <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
                            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                        </linearGradient>
                    </defs>
                    <path d={`M0,100 ${points} V100 Z`} fill="url(#chartGradient)" />
                    <polyline points={points} fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                    <circle cx="100" cy={100 - percentage} r="3" fill="white" />
                </svg>
                <div className="absolute top-0 right-0 text-indigo-900 font-black text-sm bg-white px-3 py-1 rounded-full shadow-lg">
                    {percentage}%
                </div>
            </div>
        );
    };

    const getSafePercentage = (val) => Math.min(parseFloat(val || 0), 100);

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            
            {/* HEADER COMÚN */}
            <div className={`rounded-3xl p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6
                ${user.rol === 'admin' ? 'bg-gradient-to-r from-gray-800 to-gray-900' : 
                  user.rol === 'coordinador' ? 'bg-gradient-to-r from-purple-700 to-indigo-800' : 
                  'bg-gradient-to-r from-blue-600 to-indigo-600'}`}>
                
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

            {/* VISTA ADMINISTRADOR */}
            {user.rol === 'admin' && stats && (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard title="Usuarios" value={stats.usuarios} icon={UserGroupIcon} color={{ bg: 'bg-blue-100', text: 'text-blue-600', bgMain: 'bg-blue-500' }} subtext="Activos en sistema"/>
                        <StatCard title="Estudiantes" value={stats.estudiantes} icon={AcademicCapIcon} color={{ bg: 'bg-green-100', text: 'text-green-600', bgMain: 'bg-green-500' }} subtext="En el sistema"/>
                        <StatCard title="Asignaturas" value={stats.asignaturas} icon={BookOpenIcon} color={{ bg: 'bg-purple-100', text: 'text-purple-600', bgMain: 'bg-purple-500' }} subtext="Total ofertado"/>
                        <StatCard title="Periodos" value={stats.periodos} icon={CalendarDaysIcon} color={{ bg: 'bg-orange-100', text: 'text-orange-600', bgMain: 'bg-orange-500' }} subtext="Gestión académica"/>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><SparklesIcon className="h-5 w-5 text-yellow-500"/> Gestión Rápida</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <ActionCard title="Gestionar Usuarios" desc="Crear, editar o eliminar cuentas." icon={UserGroupIcon} colorClass="bg-blue-500" onClick={() => navigate('/dashboard/usuarios')}/>
                            <ActionCard title="Periodos Académicos" desc="Abrir o cerrar ciclos lectivos." icon={CalendarDaysIcon} colorClass="bg-orange-500" onClick={() => navigate('/dashboard/periodos')}/>
                            <ActionCard title="Catálogo Materias" desc="Administrar asignaturas y mallas." icon={BookOpenIcon} colorClass="bg-purple-500" onClick={() => navigate('/dashboard/asignaturas')}/>
                            <ActionCard title="Habilidades Blandas" desc="Configurar catálogo de competencias." icon={SparklesIcon} colorClass="bg-pink-500" onClick={() => navigate('/dashboard/habilidades')}/>
                        </div>
                    </div>
                </div>
            )}

            {/* VISTA COORDINADOR */}
            {user.rol === 'coordinador' && stats && (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard title="Cargas Asignadas" value={stats.asignaciones} icon={BookOpenIcon} color={{ bg: 'bg-indigo-100', text: 'text-indigo-600', bgMain: 'bg-indigo-500' }} subtext="Docentes ubicados"/>
                        <StatCard title="Planificaciones" value={stats.planificaciones} icon={ClipboardDocumentCheckIcon} color={{ bg: 'bg-pink-100', text: 'text-pink-600', bgMain: 'bg-pink-500' }} subtext="Habilidades definidas"/>
                        <StatCard title="Cumplimiento" value={`${getSafePercentage(stats.cumplimiento)}%`} icon={PresentationChartLineIcon} color={{ bg: 'bg-teal-100', text: 'text-teal-600', bgMain: getSafePercentage(stats.cumplimiento) > 80 ? 'bg-teal-500' : 'bg-orange-500' }} subtext="Avance global" trend="good"/>
                        <StatCard title="Actas Generadas" value={stats.reportes} icon={CheckBadgeIcon} color={{ bg: 'bg-red-100', text: 'text-red-600', bgMain: 'bg-red-500' }} subtext="Cierres de ciclo"/>
                    </div>
                    {/* ACCIONES Y GRÁFICA */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><SparklesIcon className="h-5 w-5 text-indigo-500"/> Acciones de Coordinación</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <ActionCard title="Distribución de Carga" desc="Asignar materias a docentes." icon={UserGroupIcon} colorClass="bg-indigo-600" onClick={() => navigate('/dashboard/asignaciones')}/>
                            <ActionCard title="Matriculación" desc="Inscribir estudiantes en materias." icon={UserPlusIcon} colorClass="bg-blue-600" onClick={() => navigate('/dashboard/matriculacion')}/>
                            <ActionCard title="Monitor de Reportes" desc="Verificar cumplimiento docente." icon={DocumentChartBarIcon} colorClass="bg-teal-600" onClick={() => navigate('/dashboard/reportes')}/>
                        </div>
                        {/* GRÁFICA FULL WIDTH */}
                        <div className="bg-gradient-to-br from-purple-700 to-indigo-800 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                                <div className="md:w-1/3">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm shadow-inner"><PresentationChartLineIcon className="h-8 w-8 text-white"/></div>
                                        <h3 className="text-2xl font-bold tracking-tight">Avance del Periodo</h3>
                                    </div>
                                    <p className="text-purple-100 text-lg leading-relaxed">El cumplimiento de la planificación docente ha alcanzado un <strong className="text-white bg-white/20 px-2 rounded">{getSafePercentage(stats.cumplimiento)}%</strong> del objetivo establecido.</p>
                                </div>
                                <div className="md:w-2/3 w-full h-40 bg-black/20 rounded-2xl p-4 border border-white/5 backdrop-blur-sm">
                                    <SimpleLineChart percentage={getSafePercentage(stats.cumplimiento)} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* VISTA DOCENTE */}
            {user.rol === 'docente' && stats && (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard title="Mis Materias" value={stats.mis_materias} icon={BookOpenIcon} color={{ bg: 'bg-blue-100', text: 'text-blue-600', bgMain: 'bg-blue-500' }} subtext="Carga actual"/>
                        <StatCard title="Planificadas" value={stats.mis_planes} icon={ClipboardDocumentCheckIcon} color={{ bg: 'bg-emerald-100', text: 'text-emerald-600', bgMain: 'bg-emerald-500' }} subtext="Habilidades activas"/>
                        <StatCard title="Estudiantes" value={stats.mis_alumnos} icon={UserGroupIcon} color={{ bg: 'bg-amber-100', text: 'text-amber-600', bgMain: 'bg-amber-500' }} subtext="Total en lista"/>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><SparklesIcon className="h-5 w-5 text-blue-500"/> Tu Espacio de Trabajo</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <ActionCard title="Mis Cursos" desc="Ver listado y gestionar materias." icon={BookOpenIcon} colorClass="bg-blue-600" onClick={() => navigate('/dashboard/mis-cursos')}/>
                            <ActionCard title="Planificar Habilidades" desc="Definir competencias por materia." icon={PencilSquareIcon} colorClass="bg-indigo-500" onClick={() => navigate('/dashboard/planificacion')}/>
                            <ActionCard title="Calificar" desc="Evaluar desempeño estudiantil." icon={CheckBadgeIcon} colorClass="bg-emerald-600" onClick={() => navigate('/dashboard/evaluacion')}/>
                            <ActionCard title="Fichas Resumen" desc="Matriz general de notas." icon={DocumentCheckIcon} colorClass="bg-cyan-600" onClick={() => navigate('/dashboard/fichas-resumen')}/>
                            <ActionCard title="Mis Reportes" desc="Generar actas y ver gráficas." icon={ChartBarIcon} colorClass="bg-rose-500" onClick={() => navigate('/dashboard/reportes-docente')}/>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardHome;
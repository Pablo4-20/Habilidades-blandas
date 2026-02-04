import { Link, useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { 
    HomeIcon, UsersIcon, AcademicCapIcon, ClipboardDocumentCheckIcon, 
    DocumentChartBarIcon, ArrowRightOnRectangleIcon, ChevronLeftIcon, 
    ChevronRightIcon, SparklesIcon, BookOpenIcon, CalendarDaysIcon, 
    DocumentCheckIcon, ClipboardDocumentListIcon, UserPlusIcon 
} from '@heroicons/react/24/outline';

const Sidebar = ({ isOpen, toggleSidebar }) => {
    const userStored = localStorage.getItem('user');
    const user = userStored ? JSON.parse(userStored) : null;
    const role = user?.rol;
    
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        Swal.fire({
            title: '¿Cerrar Sesión?',
            text: "Estás a punto de salir del sistema.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#2563EB',
            cancelButtonColor: '#9CA3AF',
            confirmButtonText: 'Sí, salir',
            cancelButtonText: 'Cancelar',
            reverseButtons: true
        }).then((result) => {
            if (result.isConfirmed) {
                localStorage.clear();
                window.location.replace('/');
            }
        });
    };

    const menuItems = {
        admin: [
            { name: 'Inicio', path: '/dashboard', icon: HomeIcon },
            { name: 'Periodos Académicos', path: '/dashboard/periodos', icon: CalendarDaysIcon },
            { name: 'Gestión Usuarios', path: '/dashboard/usuarios', icon: UsersIcon },
            { name: 'Asignaturas', path: '/dashboard/asignaturas', icon: BookOpenIcon },
            { name: 'Habilidades', path: '/dashboard/habilidades', icon: SparklesIcon },
        ],
        coordinador: [
            { name: 'Inicio', path: '/dashboard', icon: HomeIcon },
            { name: 'Asignar Materias', path: '/dashboard/asignaciones', icon: AcademicCapIcon },
            { name: 'Matriculación', path: '/dashboard/matriculacion', icon: UserPlusIcon },      
            { name: 'Reportes Generales', path: '/dashboard/reportes', icon: DocumentChartBarIcon },
            { name: 'Ficha Resumen', path: '/dashboard/ficha-resumen-coordinador', icon: ClipboardDocumentListIcon },
        ],
        docente: [
            { name: 'Inicio', path: '/dashboard', icon: HomeIcon },
            { name: 'Mis Cursos', path: '/dashboard/mis-cursos', icon: BookOpenIcon },
            { name: 'Planificación', path: '/dashboard/planificacion', icon: ClipboardDocumentCheckIcon },
            { name: 'Calificar', path: '/dashboard/evaluacion', icon: UsersIcon },
            { name: 'Observaciones HB', path: '/dashboard/reportes-docente', icon: DocumentChartBarIcon },
            { name: 'Fichas Resumen', path: '/dashboard/fichas-resumen', icon: DocumentCheckIcon },
        ]
    };

    const currentMenu = menuItems[role] || [];

    return (
        <>
            {/* FONDO OSCURO (OVERLAY) SOLO PARA MÓVIL */}
            {/* Se muestra solo si isOpen es true y estamos en móvil (md:hidden) */}
            <div 
                className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 md:hidden ${
                    isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
                }`}
                onClick={toggleSidebar} // Cierra al dar click afuera
            />

            {/* BARRA LATERAL */}
            <div 
                className={`
                    fixed top-0 left-0 h-screen bg-white border-r border-gray-200 
                    flex flex-col z-50 transition-all duration-300 ease-in-out
                    
                    /* --- COMPORTAMIENTO MÓVIL --- */
                    w-64 
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                    
                    /* --- COMPORTAMIENTO ESCRITORIO (md) --- */
                    /* Anula la traslación del móvil y usa anchos variables */
                    md:translate-x-0 
                    ${isOpen ? 'md:w-64' : 'md:w-20'}
                `}
            >
                {/* HEADER DEL SIDEBAR */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100 shrink-0">
                    <h1 className={`font-bold text-blue-700 transition-all duration-200 whitespace-nowrap overflow-hidden ${
                        isOpen ? 'text-xl opacity-100 w-auto' : 'md:text-[0px] md:opacity-0 md:w-0'
                    }`}>
                        Panel {role === 'admin' ? 'Admin' : 'UEB'}
                    </h1>
                    
                    {/* Botón de colapsar (Solo visible en escritorio) */}
                    <button onClick={toggleSidebar} className="hidden md:block p-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition">
                        {isOpen ? <ChevronLeftIcon className="h-5 w-5" /> : <ChevronRightIcon className="h-5 w-5" />}
                    </button>
                    
                    {/* Botón cerrar (Solo visible en móvil) */}
                    <button onClick={toggleSidebar} className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100">
                        <ChevronLeftIcon className="h-6 w-6" />
                    </button>
                </div>

                {/* NAVEGACIÓN */}
                <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-200">
                    {currentMenu.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.name}
                                to={item.path}
                                onClick={() => {
                                    // En móvil, cerramos el menú al hacer clic en un enlace
                                    if (window.innerWidth < 768) toggleSidebar();
                                }}
                                className={`
                                    flex items-center px-3 py-3 rounded-lg transition-colors duration-200 group relative
                                    ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                                    ${!isOpen ? 'md:justify-center' : ''} 
                                `}
                            >
                                <item.icon 
                                    className={`
                                        flex-shrink-0 transition-all duration-300 
                                        ${isActive ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-600'} 
                                        ${isOpen ? 'h-5 w-5 mr-3' : 'h-6 w-6'}
                                    `} 
                                />
                                
                                <span className={`font-medium whitespace-nowrap transition-all duration-300 overflow-hidden ${
                                    isOpen ? 'w-auto opacity-100' : 'md:w-0 md:opacity-0 absolute'
                                }`}>
                                    {item.name}
                                </span>
                                
                                {/* Tooltip para modo colapsado en escritorio */}
                                {!isOpen && (
                                    <div className="hidden md:group-hover:block absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap z-50">
                                        {item.name}
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* USUARIO */}
                <div className="p-4 border-t border-gray-200 shrink-0">
                    <div className={`flex items-center ${!isOpen ? 'md:justify-center' : ''}`}>
                        <div className="flex-shrink-0 h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200">
                            {user?.nombres ? user.nombres.charAt(0).toUpperCase() : '?'}
                        </div>
                        
                        <div className={`ml-3 overflow-hidden transition-all duration-300 ${isOpen ? 'w-32 opacity-100' : 'md:w-0 md:opacity-0 hidden'}`}>
                            <p className="text-sm font-medium text-gray-700 truncate">
                                {user?.nombres?.split(' ')[0]} {user?.apellidos?.split(' ')[0]}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                        </div>

                        {isOpen && (
                            <button onClick={handleLogout} className="ml-auto text-gray-400 hover:text-red-600 transition" title="Cerrar Sesión">
                                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                    {/* Botón logout cuando está colapsado */}
                    {!isOpen && (
                        <button onClick={handleLogout} className="hidden md:flex mt-4 w-full justify-center text-gray-400 hover:text-red-600 transition" title="Cerrar Sesión">
                            <ArrowRightOnRectangleIcon className="h-6 w-6" />
                        </button>
                    )}
                </div>
            </div>
        </>
    );
};

export default Sidebar;
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { 
    HomeIcon, 
    UsersIcon, 
    AcademicCapIcon, 
    ClipboardDocumentCheckIcon, 
    DocumentChartBarIcon, 
    ArrowRightOnRectangleIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    SparklesIcon,
    BookOpenIcon,
    CalendarDaysIcon,
    DocumentCheckIcon,
    ClipboardDocumentListIcon 
} from '@heroicons/react/24/outline';
import { UserPlusIcon } from '@heroicons/react/24/outline';

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
            reverseButtons: true,
            backdrop: `rgba(0,0,0,0.4)`
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
            { name: 'Monitoreo de Cumplimiento', path: '/dashboard/reportes', icon: DocumentChartBarIcon },
            
            // --- NUEVO TÍTULO DE SECCIÓN ---
            { type: 'title', name: 'Reportes Generales' },
            
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
            <div 
                className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 md:hidden ${
                    isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
                }`}
                onClick={toggleSidebar} 
            />

            <div 
                className={`
                    fixed top-0 left-0 bg-white border-r border-gray-200 
                    flex flex-col z-50 transition-all duration-300 ease-in-out
                    h-[100dvh] 
                    w-72 
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                    md:translate-x-0 
                    ${isOpen ? 'md:w-72' : 'md:w-20'}
                `}
            >
                {/* HEADER */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100 shrink-0">
                    <h1 className={`font-bold text-blue-700 transition-all duration-200 whitespace-nowrap overflow-hidden ${
                        isOpen ? 'text-xl opacity-100 w-auto' : 'md:text-[0px] md:opacity-0 md:w-0'
                    }`}>
                        Panel {role === 'admin' ? 'Admin' : 'UEB'}
                    </h1>
                    
                    {/* Botón cerrar/colapsar */}
                    <button onClick={toggleSidebar} className="p-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition focus:outline-none">
                        {isOpen ? <ChevronLeftIcon className="h-5 w-5" /> : <ChevronRightIcon className="h-5 w-5" />}
                    </button>
                </div>

                {/* NAVEGACIÓN */}
                <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-200">
                    {currentMenu.map((item, index) => {
                        // LÓGICA PARA TÍTULOS DE SECCIÓN
                        if (item.type === 'title') {
                            return (
                                <div 
                                    key={`title-${index}`} 
                                    className={`
                                        px-3 mt-4 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider transition-all duration-300
                                        ${isOpen ? 'opacity-100 block' : 'opacity-0 hidden'}
                                    `}
                                >
                                    {item.name}
                                </div>
                            );
                        }

                        // LÓGICA NORMAL PARA ENLACES
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.name}
                                to={item.path}
                                onClick={() => {
                                    if(window.innerWidth < 768) toggleSidebar();
                                }}
                                title={!isOpen ? item.name : ''}
                                className={`
                                    flex items-center px-3 py-3 rounded-lg transition-colors duration-200 group
                                    ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                                    ${!isOpen ? 'md:justify-center' : ''} 
                                `}
                            >
                                <item.icon className={`flex-shrink-0 transition-all duration-300 ${isActive ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-600'} ${isOpen ? 'h-5 w-5 mr-3' : 'h-6 w-6'}`} />
                                <span className={`font-medium whitespace-nowrap transition-all duration-300 overflow-hidden ${isOpen ? 'w-auto opacity-100' : 'md:w-0 md:opacity-0'}`}>
                                    {item.name}
                                </span>
                            </Link>
                        );
                    })}
                </nav>

                {/* USUARIO Y LOGOUT */}
                <div className="p-4 border-t border-gray-200 shrink-0 bg-white">
                    <div className={`flex items-center ${!isOpen ? 'md:justify-center' : ''}`}>
                        <div className="flex-shrink-0 h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200">
                            {user?.nombres ? user.nombres.charAt(0).toUpperCase() : '?'}
                        </div>
                        
                        <div className={`ml-3 overflow-hidden transition-all duration-300 ${isOpen ? 'w-40 opacity-100' : 'md:w-0 md:opacity-0 hidden'}`}>
                            <p className="text-sm font-medium text-gray-700 truncate">
                                {user?.nombres?.split(' ')[0]} {user?.apellidos?.split(' ')[0]}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                        </div>

                        {isOpen && (
                            <button onClick={handleLogout} className="ml-auto text-gray-400 hover:text-red-600 transition p-2 rounded-full hover:bg-red-50" title="Cerrar Sesión">
                                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                    
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
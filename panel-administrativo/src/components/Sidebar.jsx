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
    DocumentCheckIcon 
} from '@heroicons/react/24/outline';
import { UserPlusIcon } from '@heroicons/react/24/outline';

const Sidebar = ({ isOpen, toggleSidebar }) => {
    const user = JSON.parse(localStorage.getItem('user'));
    const role = user?.rol;
    const navigate = useNavigate();
    const location = useLocation();

    // --- FUNCIÓN DE CIERRE DE SESIÓN ---
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
                window.location.href = '/';
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
            { name: 'Matriculación', path: '/dashboard/matriculacion', icon: UserPlusIcon },
            { name: 'Asignar Materias', path: '/dashboard/asignaciones', icon: AcademicCapIcon },
            { name: 'Reportes Generales', path: '/dashboard/reportes', icon: DocumentChartBarIcon },
        ],
        docente: [
            { name: 'Inicio', path: '/dashboard', icon: HomeIcon },
            { name: 'Mis Cursos', path: '/dashboard/mis-cursos', icon: BookOpenIcon }, // <--- AGREGADO
            { name: 'Mis Habilidades', path: '/dashboard/planificacion', icon: ClipboardDocumentCheckIcon },
            { name: 'Calificar', path: '/dashboard/evaluacion', icon: UsersIcon },
            { name: 'Mis Reportes', path: '/dashboard/reportes-docente', icon: DocumentChartBarIcon },
            { name: 'Fichas Resumen', path: '/dashboard/fichas-resumen', icon: DocumentCheckIcon },
        ]
    };

    const currentMenu = menuItems[role] || [];

    return (
        <div 
            className={`
                h-screen bg-white border-r border-gray-200 flex flex-col fixed left-0 top-0 
                transition-all duration-300 ease-in-out z-20
                ${isOpen ? 'w-64' : 'w-20'} 
            `}
        >
            {/* HEADER */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
                <h1 className={`font-bold text-blue-700 transition-opacity duration-200 whitespace-nowrap overflow-hidden ${
                    isOpen ? 'text-xl opacity-100' : 'text-[0px] opacity-0 w-0'
                }`}>
                    Panel {role === 'admin' ? 'Admin' : 'UEB'}
                </h1>
                <button onClick={toggleSidebar} className="p-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition focus:outline-none">
                    {isOpen ? <ChevronLeftIcon className="h-5 w-5" /> : <ChevronRightIcon className="h-5 w-5" />}
                </button>
            </div>

            {/* NAVEGACIÓN */}
            <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto overflow-x-hidden">
                {currentMenu.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.name}
                            to={item.path}
                            title={!isOpen ? item.name : ''}
                            className={`
                                flex items-center px-3 py-3 rounded-lg transition-colors duration-200 group
                                ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                                ${!isOpen && 'justify-center'} 
                            `}
                        >
                            <item.icon className={`flex-shrink-0 transition-all duration-300 ${isActive ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-600'} ${isOpen ? 'h-5 w-5 mr-3' : 'h-6 w-6'}`} />
                            <span className={`font-medium whitespace-nowrap transition-all duration-300 overflow-hidden ${isOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>
                                {item.name}
                            </span>
                        </Link>
                    );
                })}
            </nav>

            {/* USUARIO */}
            <div className="p-4 border-t border-gray-200">
                <div className={`flex items-center ${!isOpen && 'justify-center'}`}>
                    <div className="flex-shrink-0 h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200">
                        {user?.nombres ? user.nombres.charAt(0).toUpperCase() : '?'}
                    </div>
                    
                    <div className={`ml-3 overflow-hidden transition-all duration-300 ${isOpen ? 'w-32 opacity-100' : 'w-0 opacity-0'}`}>
                        <p className="text-sm font-medium text-gray-700 truncate">
                            {user?.nombres} {user?.apellidos?.split(' ')[0]}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>

                    {isOpen && (
                        <button onClick={handleLogout} className="ml-auto text-gray-400 hover:text-red-600 transition" title="Cerrar Sesión">
                            <ArrowRightOnRectangleIcon className="h-5 w-5" />
                        </button>
                    )}
                </div>
                {!isOpen && (
                    <button onClick={handleLogout} className="mt-4 w-full flex justify-center text-gray-400 hover:text-red-600 transition" title="Cerrar Sesión">
                        <ArrowRightOnRectangleIcon className="h-6 w-6" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default Sidebar;
import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import api from '../services/api'; 
import { 
    HomeIcon, UsersIcon, AcademicCapIcon, ClipboardDocumentCheckIcon, 
    DocumentChartBarIcon, ArrowRightOnRectangleIcon, ChevronLeftIcon,
    ChevronRightIcon, SparklesIcon, BookOpenIcon, CalendarDaysIcon,
    DocumentCheckIcon, ClipboardDocumentListIcon, Cog6ToothIcon, 
    XMarkIcon, KeyIcon, UserIcon, EnvelopeIcon,
    EyeIcon, EyeSlashIcon, CheckCircleIcon 
} from '@heroicons/react/24/outline';
import { UserPlusIcon, CalculatorIcon, BriefcaseIcon } from '@heroicons/react/24/outline';

const Sidebar = ({ isOpen, toggleSidebar }) => {
    const userStored = localStorage.getItem('user');
    const user = userStored ? JSON.parse(userStored) : null;
    const role = user?.rol;
    
    const navigate = useNavigate();
    const location = useLocation();

    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const [showConfigModal, setShowConfigModal] = useState(false);
    const menuRef = useRef(null);

    const [passwords, setPasswords] = useState({
        current_password: '',
        new_password: '',
        new_password_confirmation: ''
    });

    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const val = {
        length: passwords.new_password.length >= 8,
        upper: /[A-Z]/.test(passwords.new_password),
        lower: /[a-z]/.test(passwords.new_password),
        number: /\d/.test(passwords.new_password),
        symbol: /[\W_]/.test(passwords.new_password),
        match: passwords.new_password === passwords.new_password_confirmation && passwords.new_password_confirmation.length > 0
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowSettingsMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = () => {
        setShowSettingsMenu(false);
        Swal.fire({
            title: '¿Cerrar Sesión?', text: "Estás a punto de salir del sistema.", icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#2563EB', cancelButtonColor: '#9CA3AF',
            confirmButtonText: 'Sí, salir', cancelButtonText: 'Cancelar', reverseButtons: true,
            backdrop: `rgba(0,0,0,0.4)`
        }).then((result) => {
            if (result.isConfirmed) { localStorage.clear(); window.location.replace('/'); }
        });
    };

    // --- NUEVO: Función para cerrar y limpiar el modal ---
    const closeConfigModal = () => {
        setShowConfigModal(false);
        setPasswords({ current_password: '', new_password: '', new_password_confirmation: '' });
        setShowCurrent(false);
        setShowNew(false);
        setShowConfirm(false);
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        
        if (!val.match) {
            return Swal.fire('Atención', 'Las contraseñas nuevas no coinciden.', 'warning');
        }

        if (!val.length || !val.upper || !val.lower || !val.number || !val.symbol) {
            return Swal.fire('Atención', 'Por favor cumple con todos los requisitos de seguridad de la contraseña.', 'warning');
        }

        try {
            await api.post('/change-password', passwords);
            Swal.fire({ title: '¡Actualizada!', text: 'Tu contraseña ha sido cambiada correctamente.', icon: 'success', timer: 2000, showConfirmButton: false });
            // Reutilizamos la función de limpieza aquí también
            closeConfigModal();
        } catch (error) {
            console.error(error);
            Swal.fire('Error', error.response?.data?.message || 'Hubo un problema al cambiar la contraseña.', 'error');
        }
    };

    const menuItems = {
        admin: [
            { name: 'Inicio', path: '/dashboard', icon: HomeIcon }, { name: 'Carreras', path: '/dashboard/carreras', icon: BriefcaseIcon },
            { name: 'Periodos Académicos', path: '/dashboard/periodos', icon: CalendarDaysIcon }, { name: 'Asignaturas', path: '/dashboard/asignaturas', icon: BookOpenIcon },
            { name: 'Habilidades', path: '/dashboard/habilidades', icon: SparklesIcon }, { name: 'Gestión Usuarios', path: '/dashboard/usuarios', icon: UsersIcon },
        ],
        coordinador: [
            { name: 'Inicio', path: '/dashboard', icon: HomeIcon }, { name: 'Asignar Materias', path: '/dashboard/asignaciones', icon: AcademicCapIcon },
            { name: 'Matriculación', path: '/dashboard/matriculacion', icon: UserPlusIcon }, { name: 'Monitoreo de Cumplimiento', path: '/dashboard/reportes', icon: DocumentChartBarIcon },
            { type: 'title', name: 'Reportes Generales' }, { name: 'Habilidades Evaluadas', path: '/dashboard/habilidades-evaluadas', icon: ClipboardDocumentCheckIcon },
            { name: 'Ficha Resumen', path: '/dashboard/ficha-resumen-coordinador', icon: ClipboardDocumentListIcon }, { name: 'Promedio Habilidad', path: '/dashboard/promedio-habilidad', icon: CalculatorIcon },
        ],
        docente: [
            { name: 'Inicio', path: '/dashboard', icon: HomeIcon }, { name: 'Mis Cursos', path: '/dashboard/mis-cursos', icon: BookOpenIcon },
            { name: 'Planificación', path: '/dashboard/planificacion', icon: ClipboardDocumentCheckIcon }, { name: 'Calificar', path: '/dashboard/evaluacion', icon: UsersIcon },
            { name: 'Observaciones HB', path: '/dashboard/reportes-docente', icon: DocumentChartBarIcon }, { name: 'Fichas Resumen', path: '/dashboard/fichas-resumen', icon: DocumentCheckIcon },
        ]
    };
    const currentMenu = menuItems[role] || [];

    return (
        <>
            <div className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 md:hidden ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`} onClick={toggleSidebar} />

            <div className={`fixed top-0 left-0 bg-white border-r border-gray-200 flex flex-col z-50 transition-all duration-300 ease-in-out h-[100dvh] w-72 ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 ${isOpen ? 'md:w-72' : 'md:w-20'}`}>
                
                <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100 shrink-0">
                    <h1 className={`font-bold text-blue-700 transition-all duration-200 whitespace-nowrap overflow-hidden ${isOpen ? 'text-xl opacity-100 w-auto' : 'md:text-[0px] md:opacity-0 md:w-0'}`}>Panel UEB</h1>
                    <button onClick={toggleSidebar} className="p-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition focus:outline-none">
                        {isOpen ? <ChevronLeftIcon className="h-5 w-5" /> : <ChevronRightIcon className="h-5 w-5" />}
                    </button>
                </div>

                <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto overflow-x-hidden custom-scrollbar">
                    {currentMenu.map((item, index) => {
                        if (item.type === 'title') return (<div key={`title-${index}`} className={`px-3 mt-4 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider transition-all duration-300 ${isOpen ? 'opacity-100 block' : 'opacity-0 hidden'}`}>{item.name}</div>);
                        const isActive = location.pathname === item.path;
                        return (
                            <Link key={item.name} to={item.path} onClick={() => { if(window.innerWidth < 768) toggleSidebar(); }} title={!isOpen ? item.name : ''}
                                className={`flex items-center px-3 py-3 rounded-lg transition-colors duration-200 group ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'} ${!isOpen ? 'md:justify-center' : ''} `}>
                                <item.icon className={`flex-shrink-0 transition-all duration-300 ${isActive ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-600'} ${isOpen ? 'h-5 w-5 mr-3' : 'h-6 w-6'}`} />
                                <span className={`font-medium whitespace-nowrap transition-all duration-300 overflow-hidden ${isOpen ? 'w-auto opacity-100' : 'md:w-0 md:opacity-0'}`}>{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-200 shrink-0 bg-white relative" ref={menuRef}>
                    <div className={`flex items-center ${!isOpen ? 'md:justify-center md:flex-col gap-2' : ''}`}>
                        <div className="flex-shrink-0 h-9 w-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
                            {user?.nombres ? user.nombres.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div className={`ml-3 overflow-hidden transition-all duration-300 ${isOpen ? 'w-40 opacity-100 block' : 'md:hidden'}`}>
                            <p className="text-sm font-bold text-gray-800 truncate">{user?.nombres?.split(' ')[0]} {user?.apellidos?.split(' ')[0]}</p>
                            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                        </div>
                        <button onClick={() => setShowSettingsMenu(!showSettingsMenu)} className={`text-gray-400 hover:text-blue-600 transition p-2 rounded-full hover:bg-blue-50 focus:outline-none ${isOpen ? 'ml-auto' : 'mt-2'}`} title="Opciones">
                            <Cog6ToothIcon className="h-5 w-5" />
                        </button>
                    </div>

                    {showSettingsMenu && (
                        <div className={`absolute bottom-full mb-3 bg-white rounded-xl shadow-xl border border-gray-100 py-2 w-48 animate-fade-in ${isOpen ? 'right-4' : 'left-full ml-4 bottom-4'}`}>
                            <button onClick={() => { setShowConfigModal(true); setShowSettingsMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition flex items-center gap-2 font-medium">
                                <Cog6ToothIcon className="h-4 w-4" /> Configuración
                            </button>
                            <div className="border-t border-gray-100 my-1"></div>
                            <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition flex items-center gap-2 font-medium">
                                <ArrowRightOnRectangleIcon className="h-4 w-4" /> Cerrar Sesión
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {showConfigModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                        <div className="px-6 py-5 bg-gradient-to-r from-blue-700 to-indigo-800 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-lg font-bold text-white">Configuración de Cuenta</h3>
                                <p className="text-blue-100 text-xs mt-0.5">Consulta tus datos y cambia tu contraseña</p>
                            </div>
                            {/* AQUÍ SE APLICA LA FUNCIÓN AL BOTÓN 'X' */}
                            <button onClick={closeConfigModal} className="p-1.5 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors">
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto">
                            <div className="space-y-4 mb-6 pb-6 border-b border-gray-100">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-1"><UserIcon className="h-4 w-4"/> Nombre Completo</label>
                                    <div className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 text-sm font-medium">{user?.nombres} {user?.apellidos}</div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-1"><EnvelopeIcon className="h-4 w-4"/> Correo Electrónico</label>
                                    <div className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 text-sm font-medium">{user?.email}</div>
                                </div>
                            </div>

                            <form id="passwordForm" onSubmit={handleChangePassword} className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1 mb-1"><KeyIcon className="h-4 w-4 text-blue-600"/> Contraseña Actual</label>
                                    <div className="relative">
                                        <input 
                                            type={showCurrent ? "text" : "password"} required 
                                            className="w-full pl-4 pr-10 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
                                            value={passwords.current_password}
                                            onChange={(e) => setPasswords({...passwords, current_password: e.target.value})}
                                        />
                                        <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none">
                                            {showCurrent ? <EyeSlashIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1 mb-1"><KeyIcon className="h-4 w-4 text-green-600"/> Nueva Contraseña</label>
                                    <div className="relative">
                                        <input 
                                            type={showNew ? "text" : "password"} required minLength="8"
                                            className="w-full pl-4 pr-10 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
                                            value={passwords.new_password}
                                            onChange={(e) => setPasswords({...passwords, new_password: e.target.value})}
                                        />
                                        <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none">
                                            {showNew ? <EyeSlashIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
                                        </button>
                                    </div>

                                    <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-[11px] font-medium bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                                        <span className={`flex items-center gap-1.5 transition-colors ${val.length ? 'text-green-600' : 'text-gray-400'}`}>
                                            <CheckCircleIcon className="h-4 w-4" /> 8 caracteres
                                        </span>
                                        <span className={`flex items-center gap-1.5 transition-colors ${val.upper ? 'text-green-600' : 'text-gray-400'}`}>
                                            <CheckCircleIcon className="h-4 w-4" /> 1 Mayúscula
                                        </span>
                                        <span className={`flex items-center gap-1.5 transition-colors ${val.lower ? 'text-green-600' : 'text-gray-400'}`}>
                                            <CheckCircleIcon className="h-4 w-4" /> 1 Minúscula
                                        </span>
                                        <span className={`flex items-center gap-1.5 transition-colors ${val.number ? 'text-green-600' : 'text-gray-400'}`}>
                                            <CheckCircleIcon className="h-4 w-4" /> 1 Número
                                        </span>
                                        <span className={`flex items-center gap-1.5 transition-colors ${val.symbol ? 'text-green-600' : 'text-gray-400'}`}>
                                            <CheckCircleIcon className="h-4 w-4" /> 1 Símbolo
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-700 flex items-center gap-1 mb-1"><KeyIcon className="h-4 w-4 text-green-600"/> Confirmar Nueva Contraseña</label>
                                    <div className="relative">
                                        <input 
                                            type={showConfirm ? "text" : "password"} required minLength="8"
                                            className="w-full pl-4 pr-10 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
                                            value={passwords.new_password_confirmation}
                                            onChange={(e) => setPasswords({...passwords, new_password_confirmation: e.target.value})}
                                        />
                                        <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none">
                                            {showConfirm ? <EyeSlashIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
                                        </button>
                                    </div>

                                    {passwords.new_password_confirmation.length > 0 && (
                                        <div className="mt-2">
                                            <span className={`text-[11px] font-medium flex items-center gap-1.5 transition-colors ${val.match ? 'text-green-600' : 'text-red-500'}`}>
                                                {val.match ? <CheckCircleIcon className="h-4 w-4" /> : <XMarkIcon className="h-4 w-4" />}
                                                {val.match ? 'Las contraseñas coinciden' : 'Las contraseñas no coinciden'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </form>
                        </div>
                        
                        <div className="p-5 border-t border-gray-100 flex gap-3 bg-gray-50 shrink-0">
                            {/* AQUÍ SE APLICA LA FUNCIÓN AL BOTÓN 'CANCELAR' */}
                            <button type="button" onClick={closeConfigModal} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-200 transition-all text-sm">Cancelar</button>
                            <button type="submit" form="passwordForm" className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all text-sm shadow-md">
                                Actualizar Contraseña
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Sidebar;
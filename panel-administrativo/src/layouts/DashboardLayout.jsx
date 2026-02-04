import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { Outlet } from 'react-router-dom';
import { Bars3Icon } from '@heroicons/react/24/outline';

const DashboardLayout = () => {
    // Estado inicial inteligente: Si es pantalla grande, inicia abierto.
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);

    // Listener para ajustar automáticamente si el usuario redimensiona la ventana
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) {
                // En escritorio, forzamos que se muestre (o puedes quitar esto si prefieres que recuerde el estado)
                setIsSidebarOpen(true);
            } else {
                // En móvil, forzamos que se oculte al redimensionar para evitar bugs visuales
                setIsSidebarOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row relative">
            
            {/* === NAVBAR SUPERIOR (SOLO MÓVIL) === */}
            <div className="md:hidden bg-white text-gray-800 px-4 py-3 flex justify-between items-center shadow-sm z-30 fixed top-0 left-0 right-0 h-16 border-b border-gray-200">
                <span className="font-bold text-lg text-blue-800 tracking-tight">Panel Administrativo</span>
                <button 
                    onClick={() => setIsSidebarOpen(true)} 
                    className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition"
                >
                    <Bars3Icon className="h-7 w-7" />
                </button>
            </div>

            {/* === SIDEBAR (COMPONENT) === */}
            <Sidebar 
                isOpen={isSidebarOpen} 
                toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
            />

            {/* === CONTENIDO PRINCIPAL === */}
            <main 
                className={`
                    flex-1 p-4 md:p-8 w-full min-h-screen transition-all duration-300 ease-in-out
                    
                    /* MÓVIL: */
                    mt-16       /* Margen arriba para no quedar bajo la navbar */
                    ml-0        /* Sin margen lateral (la sidebar flota encima) */
                    
                    /* ESCRITORIO (md): */
                    md:mt-0     /* Sin margen superior */
                    ${isSidebarOpen ? 'md:ml-64' : 'md:ml-20'} /* Margen lateral variable */
                `}
            >
                <div className="max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
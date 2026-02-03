import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { Outlet } from 'react-router-dom';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'; // Asegúrate de tener instalado @heroicons/react

const DashboardLayout = () => {
    // Detectamos si es móvil al cargar
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    // En móvil empieza cerrado (false), en PC empieza abierto (true)
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            // Si pasamos a PC, abrimos la barra automáticamente
            if (!mobile) setIsSidebarOpen(true);
            else setIsSidebarOpen(false);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row relative">
            
            {/* === BARRA SUPERIOR MÓVIL (Solo visible en celular) === */}
            <div className="md:hidden bg-white text-gray-800 p-4 flex justify-between items-center shadow-md z-40 fixed top-0 left-0 right-0 h-16">
                <span className="font-bold text-lg text-blue-800">Panel Administrativo</span>
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-md focus:bg-gray-100">
                    {isSidebarOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
                </button>
            </div>

            {/* === FONDO OSCURO (Solo en móvil cuando menú está abierto) === */}
            {isMobile && isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-30 backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar Original (No la tocamos, el CSS global la ajusta) */}
            <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

            {/* === CONTENIDO PRINCIPAL === */}
            <main 
                className={`flex-1 p-4 md:p-8 transition-all duration-300 ease-in-out w-full
                    ${/* Margen superior en móvil para no quedar debajo de la barra */ 'mt-16 md:mt-0'}
                    ${/* Márgenes laterales dinámicos solo en PC */ isMobile ? 'ml-0' : (isSidebarOpen ? 'ml-64' : 'ml-20')}
                `}
            >
                <Outlet />
            </main>
        </div>
    );
};

export default DashboardLayout;
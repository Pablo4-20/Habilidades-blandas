import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Swal from 'sweetalert2';

// --- ICONO CÉDULA ---
const IdCardIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0c0 .884-.5 2-2 2h4c-1.5 0-2-1.116-2-2z" />
    </svg>
);

const RecuperarPassword = () => {
    const [cedula, setCedula] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            
            await api.post('/forgot-password', { cedula });
            
            Swal.fire({
                icon: 'success',
                title: 'Correo Enviado',
                text: 'Si tus datos son correctos, recibirás un enlace en tu correo institucional.',
                confirmButtonColor: '#D90429',
                confirmButtonText: 'Entendido'
            });
            setCedula('');
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo procesar la solicitud. Verifique su conexión o intente más tarde.',
                confirmButtonColor: '#DC2626'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-[#0f172a] via-[#172554] to-[#1e3a8a] text-white font-sans flex flex-col relative overflow-hidden">
            
            {/* --- DECORACIÓN DE FONDO --- */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-blue-900/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-red-900/10 rounded-full blur-3xl"></div>
            </div>

            {/* --- 1. ENCABEZADO SUPERIOR (LOGO UEB) --- */}
            <header className="absolute top-0 left-0 w-full p-6 md:p-10 flex justify-start items-center z-20">
                <div className="flex items-center gap-4 select-none">
                    <div className="font-bold text-3xl tracking-tighter flex items-center">
                        <span className="text-5xl mr-3 text-white">UEB</span>
                        <div className="flex flex-col text-xs leading-4 uppercase border-l-2 pl-3 border-[#D90429]">
                            <span className="text-gray-300 tracking-wider">Universidad</span>
                            <span className="text-gray-300 tracking-wider">Estatal de </span>
                            <span className="text-[#D90429] font-bold tracking-wider">Bolívar</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* --- CONTENIDO CENTRAL --- */}
            <div className="flex-grow flex flex-col items-center justify-center w-full px-4 pt-24 pb-10 z-10 gap-12">

                

                {/* --- 3. FORMULARIO GRANDE  */}
                <div className="w-full max-w-xl"> 
                    <div className="bg-white/5 p-4 rounded-[2rem] backdrop-blur-md border border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]">
                        <div className="bg-white rounded-[1.5rem] p-8 md:p-14 w-full relative overflow-hidden">
                            
                            {/* Barra decorativa superior */}
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#D90429] to-red-800"></div>

                            <div className="text-center mb-10">
                                <h2 className="text-3xl font-bold text-gray-900 mb-2">Recuperar Contraseña</h2>
                                <p className="text-gray-500 text-lg">Ingresa tu número de cédula para buscar tu cuenta</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-8">
                                {/* Input Cédula  */}
                                <div>
                                    <label className="block text-lg font-semibold text-gray-800 mb-3">Cédula de Identidad</label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            maxLength="10"
                                            value={cedula}
                                            onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))} // Solo números
                                            className="w-full px-6 py-4 rounded-xl border-2 border-gray-200 focus:border-[#D90429] focus:ring-4 focus:ring-red-500/10 outline-none text-gray-900 placeholder-gray-400 transition-all text-lg bg-gray-50 focus:bg-white pr-14"
                                            placeholder="Ej: 0201234567"
                                            required
                                        />
                                        
                                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                                            <IdCardIcon />
                                        </div>
                                    </div>
                                </div>

                                {/* Botón Submit  */}
                                <button 
                                    type="submit" 
                                    disabled={loading}
                                    className={`w-full text-white font-bold py-4 rounded-xl shadow-xl transition-all duration-300 text-xl mt-4 transform hover:-translate-y-1
                                    ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#D90429] hover:bg-[#b00220] hover:shadow-red-600/30'}`}
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            Procesando...
                                        </span>
                                    ) : 'Enviar Enlace de Recuperación'}
                                </button>
                            </form>

                            {/* Enlace Volver */}
                            <div className="mt-8 text-center">
                                <Link to="/" className="inline-flex items-center gap-2 text-base text-gray-500 hover:text-[#D90429] font-medium transition-colors hover:underline">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                    Volver al inicio de sesión
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Footer */}
            <div className="w-full text-center py-6 z-10">
                <p className="text-xs text-white/30 uppercase tracking-widest">
                    © {new Date().getFullYear()} Universidad Estatal de Bolívar
                </p>
            </div>
        </div>
    );
};

export default RecuperarPassword;
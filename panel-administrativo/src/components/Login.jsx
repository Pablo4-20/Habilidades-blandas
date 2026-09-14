import { useState, useEffect } from 'react';
import api from '../services/api';
import { Link, useNavigate, useLocation } from 'react-router-dom'; 
import Swal from 'sweetalert2'; 

// --- ICONOS ---
const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
);
const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
);

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false); 
    
    // 👇 Estados para los modales del Footer
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);

    const navigate = useNavigate();
    const location = useLocation(); 

    // BLOQUEAR BOTÓN ATRÁS ---
    useEffect(() => {
        window.history.pushState(null, null, window.location.href);
        const handlePopState = () => {
            window.history.pushState(null, null, window.location.href);
        };
        window.addEventListener('popstate', handlePopState);
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

    // --- EFECTO: Mensajes de Verificación ---
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        
        if (queryParams.get('verified') === 'true' || queryParams.get('verified') === '1') {
            Swal.fire({
                title: '¡Cuenta Activada!',
                text: 'Bienvenido. Ya puedes iniciar sesión.',
                icon: 'success',
                confirmButtonColor: '#D90429', 
                timer: 5000,
                timerProgressBar: true
            });
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        if (queryParams.get('error') === 'invalid_link') {
            Swal.fire({
                title: 'Enlace Inválido',
                text: 'El enlace ha expirado.',
                icon: 'error',
                confirmButtonColor: '#DC2626'
            });
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [location]);

    // --- FUNCIÓN: Iniciar Sesión ---
    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        
        try {
            const response = await api.post('/login', { email, password });
            
            localStorage.setItem('token', response.data.access_token);
            localStorage.setItem('user', JSON.stringify(response.data.user));

            if (response.data.require_password_change) {
                navigate('/primer-cambio-password');
            } else {
                navigate('/dashboard'); 
            }

        } catch (err) {
            console.error(err); 
            if (err.response) {
                if (err.response.status === 403) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Cuenta no verificada',
                        text: 'Activa tu cuenta desde tu correo.',
                        confirmButtonText: 'Entendido',
                        confirmButtonColor: '#F59E0B'
                    });
                } else if (err.response.status === 401) {
                    setError('Credenciales incorrectas.');
                } else {
                    setError('Error de conexión.');
                }
            } else {
                setError('No se pudo conectar con el servidor.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-[#0f172a] via-[#172554] to-[#1e3a8a] text-white font-sans flex flex-col relative overflow-hidden pb-16">
            
            {/* Decoración de fondo */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-blue-900/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-red-900/10 rounded-full blur-3xl"></div>
            </div>

            {/* --- 1. ENCABEZADO SUPERIOR (LOGO UEB)  --- */}
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

                {/* --- 2. TÍTULO Y DESCRIPCIÓN --- */}
                <div className="text-center w-full max-w-7xl animate-fade-in-down">
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 tracking-tight md:whitespace-nowrap">
                        Desarrollo de <span className="text-[#D90429]">Habilidades Blandas</span>
                    </h1>
                </div>

                {/* --- 3. FORMULARIO GRANDE  */}
                <div className="w-full max-w-xl"> 
                    <div className="bg-white/5 p-4 rounded-[2rem] backdrop-blur-md border border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]">
                        <div className="bg-white rounded-[1.5rem] p-8 md:p-14 w-full relative overflow-hidden">
                            
                            {/* Barra decorativa superior */}
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#D90429] to-red-800"></div>

                            <div className="text-center mb-10">
                                <h2 className="text-3xl font-bold text-gray-900 mb-2">Acceso Administrativo</h2>
                                <p className="text-gray-500 text-lg">Ingresa tus credenciales para continuar</p>
                            </div>

                            {/* Mensaje de Error */}
                            {error && (
                                <div className="mb-8 p-4 text-base text-red-700 bg-red-50 rounded-xl border border-red-100 flex items-center gap-3">
                                    <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleLogin} className="space-y-8">
                                {/* Input Email */}
                                <div>
                                    <label className="block text-lg font-semibold text-gray-800 mb-3">Correo Institucional</label>
                                    <input 
                                        type="email" 
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-6 py-4 rounded-xl border-2 border-gray-200 focus:border-[#D90429] focus:ring-4 focus:ring-red-500/10 outline-none text-gray-900 placeholder-gray-400 transition-all text-lg bg-gray-50 focus:bg-white"
                                        placeholder="docente@ueb.edu.ec"
                                        required
                                    />
                                </div>

                                {/* Input Password  */}
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="block text-lg font-semibold text-gray-800">Contraseña</label>
                                    </div>
                                    <div className="relative">
                                        <input 
                                            type={showPassword ? "text" : "password"} 
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full px-6 py-4 rounded-xl border-2 border-gray-200 focus:border-[#D90429] focus:ring-4 focus:ring-red-500/10 outline-none text-gray-900 placeholder-gray-400 transition-all text-lg font-sans bg-gray-50 focus:bg-white pr-14"
                                            placeholder="••••••••"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-[#D90429] transition-colors p-2"
                                        >
                                            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                                        </button>
                                    </div>
                                    <div className="flex justify-end mt-3">
                                        <Link to="/recuperar-password" className="text-base font-medium text-gray-500 hover:text-[#D90429] hover:underline transition-colors">
                                            ¿Olvidaste tu contraseña?
                                        </Link>
                                    </div>
                                </div>

                                {/* Botón Submit  */}
                                <button 
                                    type="submit" 
                                    disabled={isLoading}
                                    className="w-full bg-[#D90429] hover:bg-[#b00220] text-white font-bold py-4 rounded-xl shadow-xl hover:shadow-red-600/30 transition-all duration-300 text-xl mt-4 transform hover:-translate-y-1"
                                >
                                    {isLoading ? 'Conectando...' : 'Acceder al Sistema'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            {/* 👇 NUEVO FOOTER INTEGRADO */}
            <footer className="absolute bottom-0 w-full bg-[#0f172a]/80 py-4 text-center z-20 border-t border-white/10 backdrop-blur-md shadow-lg">
                <p className="text-sm text-gray-300 font-medium">
                    Universidad Estatal de Bolívar - Carrera de Software &copy; {new Date().getFullYear()}
                </p>
                <div className="mt-2 text-xs flex justify-center gap-4 text-gray-400">
                    <button 
                        type="button"
                        onClick={() => setShowTeamModal(true)} 
                        className="hover:text-white hover:underline transition-colors focus:outline-none"
                    >
                        Equipo de Desarrollo
                    </button>
                    <span>|</span>
                    <button 
                        type="button"
                        onClick={() => setShowTermsModal(true)} 
                        className="hover:text-white hover:underline transition-colors focus:outline-none"
                    >
                        Términos y Condiciones
                    </button>
                </div>
            </footer>

            {/* 👇 MODAL: Equipo de Desarrollo */}
            {showTeamModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
                        {/* Botón X para cerrar */}
                        <button 
                            onClick={() => setShowTeamModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 focus:outline-none"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>

                        <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Equipo de Desarrollo</h3>
                        
                        <div className="text-sm text-gray-600 space-y-4 mb-6">
                            <div>
                                <p className="font-semibold text-gray-800">Desarrolladores de Software:</p>
                                <ul className="list-disc list-inside pl-2 mt-1 space-y-2">
                                    <li>
                                        <strong>Pablo Holguin</strong> - <span className="text-gray-500">Fullstack Developer</span>
                                        <a 
                                            href="https://github.com/Pablo4-20" 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="inline-block align-middle ml-2 text-gray-400 hover:text-gray-900 transition-colors"
                                            title="GitHub de Pablo Holguin"
                                        >
                                            <svg height="16" width="16" viewBox="0 0 16 16" fill="currentColor">
                                                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
                                            </svg>
                                        </a>
                                    </li>
                                    
                                </ul>
                            </div>

                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mt-4">
                                <p className="text-xs text-blue-800">
                                    <strong>Contacto de Soporte:</strong><br/>
                                    david17holguin@gmail.com | +593 980791149<br/>
                                   
                                </p>
                            </div>

                            <p className="mt-4 italic text-xs text-gray-400 text-center">
                                Sistema de Gestión de Habilidades Blandas v1.0 <br/>
                                Desarrollado en La Carrera de Software en la Universidad Estatal de Bolívar.
                            </p>
                        </div>
                        
                        <button 
                            onClick={() => setShowTeamModal(false)}
                            className="w-full py-2.5 bg-slate-800 text-white font-medium rounded-xl hover:bg-slate-700 transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )}

            {/* 👇 MODAL: Términos y Condiciones */}
             {showTermsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl relative">
                         {/* Botón X para cerrar */}
                         <button 
                            onClick={() => setShowTermsModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 focus:outline-none"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>

                        <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Términos y Condiciones</h3>
                        <div className="text-sm text-gray-600 space-y-3 mb-6 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                            <p><strong>1. Uso del Sistema:</strong> Este sistema es de uso exclusivo para el personal autorizado de la Universidad Estatal de Bolívar.</p>
                            <p><strong>2. Confidencialidad:</strong> Toda la información manejada dentro de este panel es de carácter estrictamente confidencial. La divulgación no autorizada será penalizada.</p>
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <p className="font-semibold text-gray-800 mb-2">2.1 Restricciones:</p>
                                <p className="mb-2">Queda estrictamente prohibido:</p>
                                <div className="pl-2 space-y-2">
                                    <p><strong>a)</strong> Compartir, copiar o distribuir el código fuente sin autorización.</p>
                                    <p><strong>b)</strong> La presentación o comercialización del sistema como una creación ajena al equipo de desarrollo original.</p>
                                    
                                </div>
                            </div>
                            <p><strong>3. Responsabilidad:</strong> El usuario es responsable de todas las acciones realizadas bajo sus credenciales de acceso. No comparta su contraseña con terceros.</p>
                            
                        </div>
                        
                        <button 
                            onClick={() => setShowTermsModal(false)}
                            className="w-full py-2.5 bg-[#D90429] text-white font-medium rounded-xl hover:bg-red-700 transition-colors"
                        >
                            Aceptar y Cerrar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Login;
import { useState, useEffect } from 'react';
import api from '../services/api';
// 👇 Importamos Link para la navegación a recuperar contraseña
import { Link, useNavigate, useLocation } from 'react-router-dom'; 
import Swal from 'sweetalert2'; 

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const location = useLocation(); 

    // --- EFECTO: Mensajes de Verificación (Desde el Correo) ---
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        
        // Caso 1: Verificación Exitosa (?verified=true)
        if (queryParams.get('verified') === 'true' || queryParams.get('verified') === '1') {
            Swal.fire({
                title: '¡Cuenta Activada!',
                text: 'Tu correo electrónico ha sido verificado correctamente. Ya puedes iniciar sesión.',
                icon: 'success',
                confirmButtonColor: '#2563EB', // Blue-600
                timer: 5000,
                timerProgressBar: true
            });
            // Limpiamos la URL para que no salga el mensaje al recargar
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        // Caso 2: Enlace Inválido o Expirado (?error=invalid_link)
        if (queryParams.get('error') === 'invalid_link') {
            Swal.fire({
                title: 'Enlace Inválido',
                text: 'El enlace de verificación es incorrecto o ya ha expirado.',
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
        
        try {
            const response = await api.post('/login', { email, password });
            
            // Guardar sesión
            localStorage.setItem('token', response.data.access_token);
            localStorage.setItem('user', JSON.stringify(response.data.user));

            // Verificamos si el usuario debe cambiar su contraseña
            if (response.data.require_password_change) {
                navigate('/primer-cambio-password');
            } else {
                navigate('/dashboard'); 
            }
            // Redirección al Dashboard
            navigate('/dashboard'); 

        } catch (err) {
            console.error(err); 

            if (err.response) {
                // CASO 1: Cuenta no verificada (403)
                if (err.response.status === 403) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Cuenta no verificada',
                        text: 'Debes activar tu cuenta desde el enlace que enviamos a tu correo electrónico.',
                        confirmButtonText: 'Entendido',
                        confirmButtonColor: '#F59E0B' // Amber-500
                    });
                } 
                // CASO 2: Contraseña incorrecta (401)
                else if (err.response.status === 401) {
                    setError('Credenciales incorrectas. Verifique sus datos.');
                } 
                // CASO 3: Otros errores
                else {
                    setError('Error de conexión o servidor. Intente más tarde.');
                }
            } else {
                setError('No se pudo conectar con el servidor.');
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-10 rounded-xl shadow-lg w-full max-w-md border border-gray-100">
                
                {/* Encabezado */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Acceso Administrativo</h1>
                    <p className="text-gray-500 text-sm mt-1">Sistema de Habilidades Blandas - UEB</p>
                </div>

                {/* Mensaje de error local (rojo pequeño) */}
                {error && (
                    <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg text-center" role="alert">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    {/* Input Correo */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Correo Institucional</label>
                        <input 
                            type="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition duration-200 text-gray-700 placeholder-gray-400"
                            placeholder="docente@ueb.edu.ec"
                            required
                        />
                    </div>

                    {/* Input Contraseña */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Contraseña</label>
                        <input 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition duration-200 text-gray-700 placeholder-gray-400 font-sans"
                            placeholder="••••••••"
                            required
                        />
                        
                        {/* 👇 ENLACE NUEVO: Recuperar Contraseña */}
                        <div className="flex justify-end mt-2">
                            <Link to="/recuperar-password" className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium">
                                ¿Olvidaste tu contraseña?
                            </Link>
                        </div>
                    </div>

                    {/* Botón Ingresar */}
                    <button 
                        type="submit" 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-md hover:shadow-lg transition duration-300 ease-in-out"
                    >
                        Ingresar al Sistema
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
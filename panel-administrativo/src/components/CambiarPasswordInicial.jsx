import { useState } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon, LockClosedIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

const CambiarPasswordInicial = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    // Estados para controlar la visibilidad de las contraseñas
    const [showPass, setShowPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);
    
    const navigate = useNavigate();

    // Función para validar la complejidad de la contraseña
    const validarSeguridad = (pass) => {
        if (pass.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
        if (!/[A-Z]/.test(pass)) return "Debe incluir al menos una letra mayúscula.";
        if (!/[a-z]/.test(pass)) return "Debe incluir al menos una letra minúscula.";
        if (!/[0-9]/.test(pass)) return "Debe incluir al menos un número.";
        if (!/[\W_]/.test(pass)) return "Debe incluir al menos un símbolo (ej: @, $, !, %, *).";
        return null; // Todo correcto
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // 1. Validar coincidencia
        if (password !== confirmPassword) {
            return Swal.fire('Error', 'Las contraseñas no coinciden.', 'error');
        }

        // 2. Validar requisitos de seguridad
        const errorSeguridad = validarSeguridad(password);
        if (errorSeguridad) {
            return Swal.fire({
                icon: 'warning',
                title: 'Contraseña Insegura',
                text: errorSeguridad,
                footer: 'Requisito: 8 caracteres, mayúscula, minúscula, número y símbolo.'
            });
        }

        try {
            await api.post('/change-initial-password', {
                password,
                password_confirmation: confirmPassword
            });

            await Swal.fire({
                icon: 'success',
                title: '¡Contraseña Actualizada!',
                text: 'Has establecido tu contraseña segura correctamente.',
                timer: 2000,
                showConfirmButton: false
            });
            
            // Actualizamos localStorage
            const user = JSON.parse(localStorage.getItem('user'));
            if(user) {
                user.must_change_password = 0; 
                localStorage.setItem('user', JSON.stringify(user));
            }

            navigate('/dashboard');

        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo actualizar la contraseña. Intente nuevamente.', 'error');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-blue-50 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border-t-4 border-blue-900">
                
                <div className="flex items-center gap-3 mb-2">
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-900">
                        <ShieldCheckIcon className="h-8 w-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-blue-900">Seguridad de Cuenta</h2>
                </div>
                
                <p className="text-gray-500 mb-6 text-sm">
                    Para proteger tu información, configura una nueva contraseña segura que incluya mayúsculas, números y símbolos.
                </p>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* CAMPO 1: NUEVA CONTRASEÑA */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Nueva Contraseña</label>
                        <div className="relative">
                            <input 
                                type={showPass ? "text" : "password"} 
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                                className="w-full border border-gray-300 p-2.5 pr-10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm" 
                                placeholder="Mínimo 8 caracteres, símbolos..."
                                required 
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPass(!showPass)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-blue-600 transition-colors"
                            >
                                {showPass ? <EyeSlashIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
                            </button>
                        </div>
                    </div>

                    {/* CAMPO 2: CONFIRMAR CONTRASEÑA */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Confirmar Contraseña</label>
                        <div className="relative">
                            <input 
                                type={showConfirmPass ? "text" : "password"} 
                                value={confirmPassword} 
                                onChange={e => setConfirmPassword(e.target.value)} 
                                className="w-full border border-gray-300 p-2.5 pr-10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm" 
                                placeholder="Repite tu contraseña"
                                required 
                            />
                            <button 
                                type="button"
                                onClick={() => setShowConfirmPass(!showConfirmPass)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-blue-600 transition-colors"
                            >
                                {showConfirmPass ? <EyeSlashIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
                            </button>
                        </div>
                    </div>

                    <div className="pt-2">
                        <button 
                            type="submit" 
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition shadow-lg hover:shadow-red-200 flex justify-center items-center gap-2"
                        >
                            <LockClosedIcon className="h-5 w-5" />
                            Actualizar y Entrar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CambiarPasswordInicial;
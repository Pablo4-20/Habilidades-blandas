import { useState } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import { 
    EyeIcon, EyeSlashIcon, LockClosedIcon, ShieldCheckIcon, 
    CheckCircleIcon, XCircleIcon 
} from '@heroicons/react/24/outline';

const CambiarPasswordInicial = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    // Estados para controlar la visibilidad
    const [showPass, setShowPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);
    
    const navigate = useNavigate();

    // --- REGLAS DE VALIDACIÓN EN TIEMPO REAL ---
    const validations = {
        minLength: password.length >= 8,
        hasUpper: /[A-Z]/.test(password),
        hasLower: /[a-z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        hasSymbol: /[\W_]/.test(password),
        match: password.length > 0 && password === confirmPassword
    };

    // Verificar si todo es válido para habilitar el botón
    const isFormValid = Object.values(validations).every(Boolean);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!isFormValid) return; // Doble seguridad

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
            
            // Actualizamos localStorage para desbloquear la sesión
            const user = JSON.parse(localStorage.getItem('user'));
            if(user) {
                user.must_change_password = 0; 
                localStorage.setItem('user', JSON.stringify(user));
            }

            navigate('/dashboard');

        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo actualizar la contraseña.', 'error');
        }
    };

    // Componente auxiliar para ítems de la lista de requisitos
    const RequirementItem = ({ fulfilled, text }) => (
        <li className={`flex items-center gap-2 text-xs transition-colors duration-300 ${fulfilled ? 'text-green-600 font-bold' : 'text-gray-400'}`}>
            {fulfilled ? (
                <CheckCircleIcon className="h-4 w-4 shrink-0" />
            ) : (
                <div className="h-4 w-4 rounded-full border border-gray-300 shrink-0" />
            )}
            {text}
        </li>
    );

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
                    Configura tu nueva contraseña segura.
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
                                placeholder="Ingresa tu clave..."
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

                        {/* LISTA DE REQUISITOS EN TIEMPO REAL */}
                        <ul className="mt-3 space-y-1 pl-1 bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <RequirementItem fulfilled={validations.minLength} text="Mínimo 8 caracteres" />
                            <RequirementItem fulfilled={validations.hasUpper} text="Al menos una mayúscula (A-Z)" />
                            <RequirementItem fulfilled={validations.hasLower} text="Al menos una minúscula (a-z)" />
                            <RequirementItem fulfilled={validations.hasNumber} text="Al menos un número (0-9)" />
                            <RequirementItem fulfilled={validations.hasSymbol} text="Al menos un símbolo (@, $, *, etc.)" />
                        </ul>
                    </div>

                    {/* CAMPO 2: CONFIRMAR CONTRASEÑA */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Confirmar Contraseña</label>
                        <div className="relative">
                            <input 
                                type={showConfirmPass ? "text" : "password"} 
                                value={confirmPassword} 
                                onChange={e => setConfirmPassword(e.target.value)} 
                                className={`w-full border p-2.5 pr-10 rounded-lg focus:ring-2 outline-none transition-all text-sm ${
                                    confirmPassword.length > 0 
                                        ? validations.match ? 'border-green-500 focus:ring-green-200' : 'border-red-300 focus:ring-red-200'
                                        : 'border-gray-300 focus:ring-blue-500'
                                }`}
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
                        {/* Mensaje de coincidencia */}
                        {confirmPassword.length > 0 && (
                            <div className={`text-xs mt-1 font-bold flex items-center gap-1 ${validations.match ? 'text-green-600' : 'text-red-500'}`}>
                                {validations.match ? (
                                    <><CheckCircleIcon className="h-3.5 w-3.5"/> Las contraseñas coinciden</>
                                ) : (
                                    <><XCircleIcon className="h-3.5 w-3.5"/> Las contraseñas no coinciden</>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="pt-2">
                        <button 
                            type="submit" 
                            disabled={!isFormValid}
                            className={`w-full font-bold py-3 rounded-xl transition shadow-lg flex justify-center items-center gap-2 ${
                                isFormValid 
                                ? 'bg-red-600 hover:bg-red-700 text-white hover:shadow-red-200 cursor-pointer' 
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
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
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

    // Componente auxiliar para ítems de la lista de requisitos (AUMENTADO DE TAMAÑO)
    const RequirementItem = ({ fulfilled, text }) => (
        <li className={`flex items-center gap-3 text-base transition-colors duration-300 ${fulfilled ? 'text-green-600 font-bold' : 'text-gray-400'}`}>
            {fulfilled ? (
                <CheckCircleIcon className="h-6 w-6 shrink-0" />
            ) : (
                <div className="h-6 w-6 rounded-full border-2 border-gray-300 shrink-0" />
            )}
            {text}
        </li>
    );

    return (
        <div className="min-h-screen flex items-center justify-center bg-blue-50 p-4">
            {/* AUMENTADO: max-w-2xl (antes max-w-md), p-12 (antes p-8), border-t-8 */}
            <div className="bg-white p-12 rounded-3xl shadow-2xl w-full max-w-2xl border-t-8 border-blue-900">
                
                <div className="flex items-center gap-4 mb-4">
                    {/* AUMENTADO: p-4 */}
                    <div className="bg-blue-100 p-4 rounded-xl text-blue-900">
                        {/* AUMENTADO: h-12 w-12 */}
                        <ShieldCheckIcon className="h-12 w-12" />
                    </div>
                    {/* AUMENTADO: text-4xl */}
                    <h2 className="text-4xl font-bold text-blue-900">Seguridad de Cuenta</h2>
                </div>
                
                {/* AUMENTADO: text-lg */}
                <p className="text-gray-500 mb-8 text-lg">
                    Configura tu nueva contraseña segura para continuar.
                </p>

                {/* AUMENTADO: space-y-8 */}
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* CAMPO 1: NUEVA CONTRASEÑA */}
                    <div>
                        {/* AUMENTADO: text-xl */}
                        <label className="block text-xl font-bold text-gray-700 mb-2">Nueva Contraseña</label>
                        <div className="relative">
                            <input 
                                type={showPass ? "text" : "password"} 
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                                /* AUMENTADO: p-4, text-lg, rounded-xl */
                                className="w-full border border-gray-300 p-4 pr-12 rounded-xl focus:ring-4 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-lg" 
                                placeholder="Ingresa tu clave..."
                                required 
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPass(!showPass)}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-blue-600 transition-colors"
                            >
                                {/* AUMENTADO: h-7 w-7 */}
                                {showPass ? <EyeSlashIcon className="h-7 w-7"/> : <EyeIcon className="h-7 w-7"/>}
                            </button>
                        </div>

                        {/* LISTA DE REQUISITOS EN TIEMPO REAL */}
                        {/* AUMENTADO: space-y-2, p-5 */}
                        <ul className="mt-4 space-y-2 pl-2 bg-gray-50 p-5 rounded-xl border border-gray-100">
                            <RequirementItem fulfilled={validations.minLength} text="Mínimo 8 caracteres" />
                            <RequirementItem fulfilled={validations.hasUpper} text="Al menos una mayúscula (A-Z)" />
                            <RequirementItem fulfilled={validations.hasLower} text="Al menos una minúscula (a-z)" />
                            <RequirementItem fulfilled={validations.hasNumber} text="Al menos un número (0-9)" />
                            <RequirementItem fulfilled={validations.hasSymbol} text="Al menos un símbolo (@, $, *, etc.)" />
                        </ul>
                    </div>

                    {/* CAMPO 2: CONFIRMAR CONTRASEÑA */}
                    <div>
                        {/* AUMENTADO: text-xl */}
                        <label className="block text-xl font-bold text-gray-700 mb-2">Confirmar Contraseña</label>
                        <div className="relative">
                            <input 
                                type={showConfirmPass ? "text" : "password"} 
                                value={confirmPassword} 
                                onChange={e => setConfirmPassword(e.target.value)} 
                                /* AUMENTADO: p-4, text-lg, rounded-xl */
                                className={`w-full border p-4 pr-12 rounded-xl focus:ring-4 outline-none transition-all text-lg ${
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
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-blue-600 transition-colors"
                            >
                                {/* AUMENTADO: h-7 w-7 */}
                                {showConfirmPass ? <EyeSlashIcon className="h-7 w-7"/> : <EyeIcon className="h-7 w-7"/>}
                            </button>
                        </div>
                        {/* Mensaje de coincidencia */}
                        {confirmPassword.length > 0 && (
                            // AUMENTADO: text-sm
                            <div className={`text-sm mt-2 font-bold flex items-center gap-2 ${validations.match ? 'text-green-600' : 'text-red-500'}`}>
                                {validations.match ? (
                                    <><CheckCircleIcon className="h-5 w-5"/> Las contraseñas coinciden</>
                                ) : (
                                    <><XCircleIcon className="h-5 w-5"/> Las contraseñas no coinciden</>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="pt-4">
                        <button 
                            type="submit" 
                            disabled={!isFormValid}
                            /* AUMENTADO: py-5, text-xl, rounded-2xl */
                            className={`w-full font-bold py-5 rounded-2xl transition shadow-xl flex justify-center items-center gap-3 text-xl ${
                                isFormValid 
                                ? 'bg-red-600 hover:bg-red-700 text-white hover:shadow-red-200 cursor-pointer' 
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                        >
                            <LockClosedIcon className="h-7 w-7" />
                            Actualizar y Entrar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CambiarPasswordInicial;
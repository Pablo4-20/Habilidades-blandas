import { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Swal from 'sweetalert2';

const RestablecerPassword = () => {
    const { token } = useParams(); 
    const [searchParams] = useSearchParams();
    const email = searchParams.get('email'); 
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            return Swal.fire('Error', 'Las contraseñas no coinciden.', 'warning');
        }
        if (password.length < 8) {
            return Swal.fire('Error', 'La contraseña debe tener al menos 8 caracteres.', 'warning');
        }

        setLoading(true);
        try {
            await api.post('/reset-password', {
                token,
                email,
                password,
                password_confirmation: confirmPassword
            });

            Swal.fire({
                icon: 'success',
                title: '¡Contraseña Actualizada!',
                text: 'Ya puedes ingresar con tu nueva clave.',
                confirmButtonColor: '#2563EB'
            }).then(() => {
                navigate('/'); 
            });

        } catch (error) {
            Swal.fire('Error', error.response?.data?.message || 'El enlace ha expirado o es inválido.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Crear Nueva Contraseña</h2>
                    <p className="text-gray-500 text-sm mt-2">Asegúrate de usar una contraseña segura.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="hidden" value={email || ''} />

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Nueva Contraseña</label>
                        <input 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-600 outline-none"
                            placeholder="Mínimo 8 caracteres"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Confirmar Contraseña</label>
                        <input 
                            type="password" 
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-600 outline-none"
                            placeholder="Repite la contraseña"
                            required
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition"
                    >
                        {loading ? 'Guardando...' : 'Restablecer Contraseña'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default RestablecerPassword;
import { useState } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';

const CambiarPasswordInicial = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) return Swal.fire('Error', 'Las contraseñas no coinciden', 'error');
        if (password.length < 8) return Swal.fire('Error', 'Mínimo 8 caracteres', 'warning');

        try {
            await api.post('/change-initial-password', {
                password,
                password_confirmation: confirmPassword
            });

            Swal.fire('¡Excelente!', 'Contraseña actualizada. Bienvenido al sistema.', 'success');
            
            // Actualizamos localStorage para que no pida cambio de nuevo
            const user = JSON.parse(localStorage.getItem('user'));
            user.must_change_password = 0; 
            localStorage.setItem('user', JSON.stringify(user));

            navigate('/dashboard');

        } catch (error) {
            Swal.fire('Error', 'No se pudo actualizar la contraseña', 'error');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-yellow-50 p-4">
            <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md border-t-4 border-yellow-500">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Cambio de Contraseña Obligatorio</h2>
                <p className="text-gray-600 mb-6 text-sm">
                    Por seguridad, debes cambiar la contraseña temporal asignada por el administrador antes de continuar.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700">Nueva Contraseña</label>
                        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-yellow-400 outline-none" required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700">Confirmar Contraseña</label>
                        <input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-yellow-400 outline-none" required />
                    </div>
                    <button type="submit" className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 rounded transition">
                        Actualizar y Entrar
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CambiarPasswordInicial;
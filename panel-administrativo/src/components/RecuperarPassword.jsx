import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Swal from 'sweetalert2';

const RecuperarPassword = () => {
    const [cedula, setCedula] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Enviamos la cédula al backend
            const res = await api.post('/forgot-password', { cedula });
            
            Swal.fire({
                icon: 'success',
                title: 'Correo Enviado',
                text: 'Si tus datos son correctos, recibirás un enlace en tu correo institucional.',
                confirmButtonColor: '#2563EB'
            });
            setCedula('');
        } catch (error) {
            Swal.fire('Error', 'No se pudo procesar la solicitud.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Recuperar Contraseña</h2>
                    <p className="text-gray-500 text-sm mt-2">Ingresa tu número de cédula para buscar tu cuenta.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Cédula de Identidad</label>
                        <input 
                            type="text" 
                            maxLength="10"
                            value={cedula}
                            onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))} // Solo números
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-blue-600 outline-none"
                            placeholder="Ej: 0201234567"
                            required
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className={`w-full text-white font-bold py-3 rounded-lg transition ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {loading ? 'Enviando...' : 'Enviar Enlace de Recuperación'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <Link to="/" className="text-sm text-blue-600 hover:underline font-medium">
                        ← Volver al inicio de sesión
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default RecuperarPassword;
import { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import { PencilSquareIcon, TrashIcon, PlusIcon, PhotoIcon } from '@heroicons/react/24/outline';

const GestionCarreras = () => {
    const [carreras, setCarreras] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    
    // Form states
    const [editId, setEditId] = useState(null);
    const [nombre, setNombre] = useState('');
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);

    // Obtiene la URL base del backend sin el /api (ej. http://localhost:8000)
    const backendUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000';

    useEffect(() => {
        fetchCarreras();
    }, []);

    const fetchCarreras = async () => {
        try {
            const response = await api.get('/gestion-carreras');
            setCarreras(response.data);
        } catch (error) {
            console.error('Error al cargar carreras:', error);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file)); // Crea una vista previa temporal
        }
    };

    const openModal = (carrera = null) => {
        if (carrera) {
            setIsEditing(true);
            setEditId(carrera.id);
            setNombre(carrera.nombre);
            setLogoFile(null);
            setLogoPreview(carrera.logo ? `${backendUrl}/storage/${carrera.logo}` : null);
        } else {
            setIsEditing(false);
            setEditId(null);
            setNombre('');
            setLogoFile(null);
            setLogoPreview(null);
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setNombre('');
        setLogoFile(null);
        setLogoPreview(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Al enviar archivos, debemos usar FormData en lugar de un JSON normal
        const formData = new FormData();
        formData.append('nombre', nombre);
        if (logoFile) {
            formData.append('logo', logoFile);
        }

        try {
            if (isEditing) {
                // Truco de Laravel: Las peticiones PUT con archivos necesitan simularse con POST y _method
                formData.append('_method', 'PUT'); 
                await api.post(`/gestion-carreras/${editId}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                Swal.fire('Actualizado', 'La carrera ha sido actualizada', 'success');
            } else {
                await api.post('/gestion-carreras', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                Swal.fire('Creado', 'La carrera ha sido creada', 'success');
            }
            closeModal();
            fetchCarreras();
        } catch (error) {
            Swal.fire('Error', error.response?.data?.message || 'Ocurrió un error', 'error');
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: "No podrás revertir esto. Podría afectar reportes vinculados.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/gestion-carreras/${id}`);
                Swal.fire('Eliminado!', 'La carrera y su logo han sido eliminados.', 'success');
                fetchCarreras();
            } catch (error) {
                Swal.fire('Error', 'No se pudo eliminar la carrera', 'error');
            }
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Gestión de Carreras</h1>
                <button 
                    onClick={() => openModal()} 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
                >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Nueva Carrera
                </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Logo</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre de la Carrera</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {carreras.map((carrera) => (
                            <tr key={carrera.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {carrera.logo ? (
                                        <img src={`${backendUrl}/storage/${carrera.logo}`} alt={carrera.nombre} className="h-12 w-12 object-contain rounded border" />
                                    ) : (
                                        <div className="h-12 w-12 bg-gray-100 flex items-center justify-center rounded border text-gray-400">
                                            <PhotoIcon className="h-6 w-6" />
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                    {carrera.nombre}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => openModal(carrera)} className="text-blue-600 hover:text-blue-900 mr-4">
                                        <PencilSquareIcon className="h-5 w-5 inline" />
                                    </button>
                                    <button onClick={() => handleDelete(carrera.id)} className="text-red-600 hover:text-red-900">
                                        <TrashIcon className="h-5 w-5 inline" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">{isEditing ? 'Editar Carrera' : 'Nueva Carrera'}</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Carrera</label>
                                <input 
                                    type="text" 
                                    value={nombre} 
                                    onChange={(e) => setNombre(e.target.value)} 
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Logo de la Carrera (Imagen)</label>
                                <input 
                                    type="file" 
                                    accept="image/png, image/jpeg, image/jpg, image/svg+xml"
                                    onChange={handleFileChange} 
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none"
                                />
                                {logoPreview && (
                                    <div className="mt-3">
                                        <p className="text-xs text-gray-500 mb-1">Vista previa:</p>
                                        <img src={logoPreview} alt="Preview" className="h-20 object-contain border rounded p-1" />
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={closeModal} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">
                                    Cancelar
                                </button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GestionCarreras;
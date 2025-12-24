import axios from 'axios';

const api = axios.create({
    baseURL: 'http://127.0.0.1:8000/api', // Tu URL actual
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// 1. INTERCEPTOR DE SOLICITUD (Envia el token)
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// 2. INTERCEPTOR DE RESPUESTA (Maneja el error 401 Automáticamente)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Si el servidor dice "401 Unauthorized" (Token vencido o inválido)
        if (error.response && error.response.status === 401) {
            console.warn("⚠️ Sesión expirada o inválida. Cerrando sesión...");
            
            // BORRAMOS TODO AUTOMÁTICAMENTE
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            // REDIRIGIMOS AL LOGIN SI NO ESTAMOS YA AHÍ
            if (window.location.pathname !== '/') {
                window.location.href = '/';
            }
        }
        return Promise.reject(error);
    }
);

// =========================================================
//  NUEVAS FUNCIONES PARA EL PANEL ADMINISTRATIVO
// =========================================================

// 1. AUTENTICACIÓN
export const login = (credentials) => api.post('/login', credentials);
export const logout = () => api.post('/logout');

// 2. ASIGNATURAS (CRUD + IMPORTACIÓN)
export const getAsignaturas = () => api.get('/asignaturas');
export const createAsignatura = (data) => api.post('/asignaturas', data);
export const updateAsignatura = (id, data) => api.put(`/asignaturas/${id}`, data);
export const deleteAsignatura = (id) => api.delete(`/asignaturas/${id}`);
// Importante: Para subir archivos, el header debe ser multipart/form-data
export const importAsignaturas = (formData) => api.post('/asignaturas/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});

// 3. CATÁLOGOS (Para llenar los <select> del formulario)
// Asegúrate de haber creado las rutas en api.php
export const getCarreras = () => api.get('/carreras');
export const getCiclos = () => api.get('/ciclos');
export const getUnidades = () => api.get('/unidades');

// 4. HABILIDADES BLANDAS (Catálogo Global)
export const getHabilidades = () => api.get('/habilidades-blandas');
export const createHabilidad = (data) => api.post('/habilidades-blandas', data);
export const updateHabilidad = (id, data) => api.put(`/habilidades-blandas/${id}`, data);
export const deleteHabilidad = (id) => api.delete(`/habilidades-blandas/${id}`);

// 5. USUARIOS (Si ya tenías gestión de usuarios)
export const getUsuarios = () => api.get('/users'); 
export const createUsuario = (data) => api.post('/users', data);
export const updateUsuario = (id, data) => api.put(`/users/${id}`, data);
export const deleteUsuario = (id) => api.delete(`/users/${id}`);

export default api;
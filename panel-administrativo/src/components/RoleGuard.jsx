import { Navigate, Outlet } from 'react-router-dom';

const RoleGuard = ({ allowedRoles }) => {
    // 1. Obtenemos el usuario del almacenamiento
    const user = JSON.parse(localStorage.getItem('user'));
    
    // 2. Si no hay usuario, mandamos al login (por seguridad extra)
    if (!user || !user.rol) {
        return <Navigate to="/" replace />;
    }

    // 3. VERIFICACIÓN CRÍTICA: ¿El rol del usuario está en la lista permitida?
    if (!allowedRoles.includes(user.rol)) {
        
        
        return <Navigate to="/dashboard" replace />;
    }

   
    return <Outlet />;
};

export default RoleGuard;
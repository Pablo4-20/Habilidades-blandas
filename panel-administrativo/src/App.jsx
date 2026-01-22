import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardHome from './components/DashboardHome';
import PlanificacionDocente from './components/PlanificacionDocente';
import GestionUsuarios from './components/GestionUsuarios';
import GestionHabilidades from './components/GestionHabilidades';
import GestionAsignaturas from './components/GestionAsignaturas'; 
import AsignarMaterias from './components/AsignarMaterias';
import EvaluacionDocente from './components/EvaluacionDocente';
import RoleGuard from './components/RoleGuard';
import ReportesDocente from './components/ReportesDocente';
import ReportesCoordinador from './components/ReportesCoordinador';
import GestionPeriodos from './components/GestionPeriodos';
import CambiarPasswordInicial from './components/CambiarPasswordInicial';
import FichaResumen from './components/FichaResumen';
import Matriculacion from './components/Matriculacion'; 
// 👇 IMPORTAR EL NUEVO COMPONENTE
import MisCursos from './components/MisCursos'; 

import RecuperarPassword from './components/RecuperarPassword';
import RestablecerPassword from './components/RestablecerPassword';

// --- Rutas de Protección ---
const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    if (!token) return <Navigate to="/" replace />;
    return children;
};

const PublicRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    if (token) return <Navigate to="/dashboard" replace />;
    return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* --- ZONA PÚBLICA --- */}
        <Route path="/" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/recuperar-password" element={<PublicRoute><RecuperarPassword /></PublicRoute>} />
        <Route path="/reset-password/:token" element={<PublicRoute><RestablecerPassword /></PublicRoute>} />
        <Route path="/primer-cambio-password" element={<ProtectedRoute><CambiarPasswordInicial /></ProtectedRoute>} />

        {/* --- ZONA PRIVADA (DASHBOARD) --- */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<DashboardHome />} />

            {/* ZONA DOCENTE */}
            <Route element={<RoleGuard allowedRoles={['docente']} />}>
                {/* 👇 AGREGA ESTA LÍNEA PARA QUE FUNCIONE */}
                <Route path="mis-cursos" element={<MisCursos />} />
                
                <Route path="planificacion" element={<PlanificacionDocente />} />
                <Route path="evaluacion" element={<EvaluacionDocente />} />
                <Route path="reportes-docente" element={<ReportesDocente />} />
                <Route path="fichas-resumen" element={<FichaResumen />} />
            </Route>

            {/* ZONA ADMIN */}
            <Route element={<RoleGuard allowedRoles={['admin']} />}>
                <Route path="usuarios" element={<GestionUsuarios />} />
                <Route path="habilidades" element={<GestionHabilidades />} />
                <Route path="asignaturas" element={<GestionAsignaturas />} /> 
                <Route path="periodos" element={<GestionPeriodos />} />
            </Route>

            {/* ZONA COORDINADOR */}
            <Route element={<RoleGuard allowedRoles={['coordinador']} />}>
                <Route path="asignaciones" element={<AsignarMaterias />} />
                <Route path="reportes" element={<ReportesCoordinador />} />
                <Route path="matriculacion" element={<Matriculacion />} />
            </Route>

        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
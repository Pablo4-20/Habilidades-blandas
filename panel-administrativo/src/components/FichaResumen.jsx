import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import CustomSelect from './ui/CustomSelect'; 
import { 
    PrinterIcon, BookOpenIcon, CalendarDaysIcon, 
    DocumentCheckIcon, TableCellsIcon, DocumentTextIcon
} from '@heroicons/react/24/outline';

// --- IMPORTACIÓN DE LOGOS ---
import logoIzq from '../assets/facultad.png'; 
import logoSoftware from '../assets/software.png'; 
import logoTec from '../assets/tecnologias.png';   

const FichaResumen = () => {
    const [asignacionesRaw, setAsignacionesRaw] = useState([]);
    
    // Estados de selección
    const [selectedMateriaId, setSelectedMateriaId] = useState('');
    const [selectedParalelo, setSelectedParalelo] = useState(''); 
    const [selectedPeriodo, setSelectedPeriodo] = useState('');
    
    const [loadingGeneral, setLoadingGeneral] = useState(false);
    const [loadingIndividual, setLoadingIndividual] = useState(false);

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const [resAsig, resPer] = await Promise.all([
                    api.get('/docente/asignaturas'),
                    api.get('/periodos/activos')
                ]);
                setAsignacionesRaw(Array.isArray(resAsig.data) ? resAsig.data : []);
                const activo = (Array.isArray(resPer.data) ? resPer.data : []).find(p => p.activo);
                if (activo) setSelectedPeriodo(activo.nombre);
            } catch (error) { console.error(error); }
        };
        cargarDatos();
    }, []);

    // --- MANEJO DE SELECTOR DE MATERIA (ID + PARALELO) ---
    const handleCambioMateria = (val) => {
        if (!val) {
            setSelectedMateriaId('');
            setSelectedParalelo('');
            return;
        }
        const [id, par] = val.split('-');
        setSelectedMateriaId(id);
        setSelectedParalelo(par);
    };

    // Construcción de opciones con Paralelo
    const opcionesMaterias = useMemo(() => {
        if (!selectedPeriodo) return [];
        const delPeriodo = asignacionesRaw.filter(a => a.periodo === selectedPeriodo);
        
        return delPeriodo.map(item => ({
            value: `${item.id}-${item.paralelo}`, 
            label: `${item.nombre} - Paralelo ${item.paralelo}`, 
            subtext: item.carrera 
        }));
    }, [asignacionesRaw, selectedPeriodo]);

    const valorSelectMateria = (selectedMateriaId && selectedParalelo) 
        ? `${selectedMateriaId}-${selectedParalelo}` 
        : '';

    // ------------------------------------------------------------------------
    // OPCIÓN 1: FICHA RESUMEN GENERAL (PDF HORIZONTAL)
    // ------------------------------------------------------------------------
    const descargarFichaResumen = async () => {
        if (!selectedPeriodo) return;
        setLoadingGeneral(true);
        try {
            const res = await api.post('/reportes/pdf-data-general', { periodo: selectedPeriodo });
            const { info, filas } = res.data;

            if (!filas || filas.length === 0) {
                Swal.fire('Info', 'No hay datos de ejecución.', 'info');
                return;
            }

            const doc = new jsPDF({ orientation: "landscape" }); 
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight(); 

            const fechaActual = new Date().toLocaleString('es-ES', {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });

            // --- LÓGICA DE SELECCIÓN DE LOGO ---
            // Si la carrera contiene "tecnolog" (mayus o minus), usa el logo de tecnología, si no, el de software
            const logoDerecha = (info.carrera && info.carrera.toLowerCase().includes('tecnolog')) 
                                ? logoTec 
                                : logoSoftware;

            // --- ENCABEZADO ---
            const imgW = 20; const imgH = 20; 
            try { doc.addImage(logoIzq, 'PNG', 10, 5, imgW, imgH); } catch (e) {}
            // Logo dinámico
            try { doc.addImage(logoDerecha, 'PNG', pageWidth - 30, 5, imgW, imgH); } catch (e) {}

            doc.setFontSize(14); doc.setTextColor(40, 53, 147);
            doc.text("UNIVERSIDAD ESTATAL DE BOLIVAR", pageWidth / 2, 12, { align: "center" });
            
            doc.setFontSize(10); doc.setTextColor(80);
            doc.text("FACULTAD DE CIENCIAS ADMINISTRATIVAS, GESTIÓN EMPRESARIAL E INFORMÁTICA", pageWidth / 2, 19, { align: "center", maxWidth: pageWidth - 70 });
            
            doc.setTextColor(0); doc.setFont("helvetica", "bold");
            doc.text("ANEXO 1: FICHA RESUMEN DE EJECUCIÓN", pageWidth / 2, 28, { align: "center" });

            // --- INFO ---
            autoTable(doc, {
                startY: 34, theme: 'plain',
                body: [
                    ['Carrera:', info.carrera, 'Periodo Académico:', info.periodo], 
                    ['Docente:', info.generado_por, '', '']
                ],
                styles: { fontSize: 10, cellPadding: 1 }, 
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 }, 2: { fontStyle: 'bold', cellWidth: 35 } }
            });

            const cuerpoTabla = filas.map(f => [
                f.asignatura, 
                f.ciclo, 
                f.habilidad,
                f.n1, f.n2, f.n3, f.n4, f.n5, 
                f.conclusion || " " 
            ]);

            autoTable(doc, {
                startY: doc.lastAutoTable.finalY + 5,
                head: [['Asignatura', 'Ciclo', 'Habilidad Blanda', 'N1', 'N2', 'N3', 'N4', 'N5', 'Conclusión']],
                body: cuerpoTabla, theme: 'grid',
                headStyles: { fillColor: [220, 230, 241], textColor: 0, fontSize: 8, halign: 'center', valign: 'middle', lineColor: [150,150,150], lineWidth: 0.1 },
                bodyStyles: { fontSize: 7, valign: 'middle', halign: 'center' },
                columnStyles: { 
                    0: { halign: 'left', cellWidth: 35 }, 
                    2: { halign: 'left', cellWidth: 35 },
                    8: { halign: 'left', cellWidth: 'auto' } 
                }
            });

            // --- PIE DE PÁGINA (GENERAL) ---
            const footerY = pageHeight - 25; 
            if (doc.lastAutoTable.finalY > (footerY - 20)) {
                doc.addPage();
            }
            
            doc.setDrawColor(0); 
            doc.line(14, footerY, 80, footerY); 
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.setTextColor(0);
            
            doc.text(info.generado_por, 14, footerY + 5); 
            
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            doc.text("DOCENTE", 14, footerY + 9);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text(`Generado el: ${fechaActual}`, pageWidth - 14, footerY + 5, { align: "right" });

            doc.save(`Ficha_Resumen_${info.periodo}.pdf`);
        } catch (error) { 
            console.error(error); 
            if (error.response && error.response.status === 404) {
                Swal.fire('Atención', 'No hay datos de ejecución para generar la ficha resumen.', 'warning');
            } else {
                Swal.fire('Error', 'Error al generar.', 'error');
            }
        } 
        finally { setLoadingGeneral(false); }
    };

    // ------------------------------------------------------------------------
    // OPCIÓN 2: ACTAS INDIVIDUALES (LÓGICA CON LOGO DINÁMICO)
    // ------------------------------------------------------------------------
    const descargarActasIndividuales = async () => {
        if (!selectedMateriaId || !selectedPeriodo || !selectedParalelo) return Swal.fire('Error', 'Selecciona una materia.', 'warning');
        
        setLoadingIndividual(true);
        try {
            const res = await api.post('/reportes/pdf-data', { 
                asignatura_id: selectedMateriaId, 
                periodo: selectedPeriodo,
                paralelo: selectedParalelo
            });
            const data = res.data;
            if (!data.reportes || data.reportes.length === 0) { Swal.fire('Info', 'Sin datos.', 'info'); return; }

            const doc = new jsPDF(); 
            const info = data.info;
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            const fechaActual = new Date().toLocaleString('es-ES', {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });

            const drawHeader = (doc) => {
                const imgW = 20; const imgH = 20; 
                
                // --- LÓGICA DE SELECCIÓN DE LOGO (REPETIDA PARA ACTAS) ---
                const logoDerecha = (info.carrera && info.carrera.toLowerCase().includes('tecnolog')) 
                                    ? logoTec 
                                    : logoSoftware;

                try { doc.addImage(logoIzq, 'PNG', 10, 8, imgW, imgH); } catch (e) {}
                // Logo dinámico
                try { doc.addImage(logoDerecha, 'PNG', pageWidth - 30, 8, imgW, imgH); } catch (e) {}

                doc.setFontSize(13); doc.setTextColor(40, 53, 147); 
                doc.text("UNIVERSIDAD ESTATAL DE BOLIVAR", pageWidth/2, 15, { align: "center" });
                
                doc.setFontSize(9); doc.setTextColor(80);
                doc.text("FACULTAD DE CIENCIAS ADMINISTRATIVAS, GESTIÓN EMPRESARIAL E INFORMÁTICA", pageWidth/2, 22, { align: "center", maxWidth: pageWidth - 70 }); 
                
                doc.setTextColor(0);
            };

            const reportesOrdenados = [...data.reportes].sort((a, b) => {
                if (a.habilidad < b.habilidad) return -1;
                if (a.habilidad > b.habilidad) return 1;
                return parseInt(a.parcial_asignado) - parseInt(b.parcial_asignado);
            });

            let paginaAgregada = false;

            reportesOrdenados.forEach((rep) => {
                const ests = rep.parcial_asignado === '1' ? rep.detalle_p1 : rep.detalle_p2;
                if (ests && ests.length > 0) {
                    if (paginaAgregada) doc.addPage(); else paginaAgregada = true;
                    
                    drawHeader(doc);
                    
                    let y = 40; 
                    const xLabelL = 14; const xValueL = 45; 
                    const xLabelR = 110; const xValueR = 145;
                    const maxW_L = 60; const maxW_R = 55;

                    doc.setFontSize(10);
                    
                    // --- BLOQUE DE INFORMACIÓN ---
                    doc.setFont("helvetica", "bold"); doc.text("Carrera:", xLabelL, y);
                    doc.setFont("helvetica", "normal"); doc.text(info.carrera, xValueL, y);

                    doc.setFont("helvetica", "bold"); doc.text("Periodo Académico:", xLabelR, y);
                    doc.setFont("helvetica", "normal"); doc.text(info.periodo, xValueR, y);

                    y += 8;
                    doc.setFont("helvetica", "bold"); doc.text("Ciclo:", xLabelL, y);
                    doc.setFont("helvetica", "normal"); doc.text(`${info.ciclo} "${info.paralelo || selectedParalelo}"`, xValueL, y); 

                    doc.setFont("helvetica", "bold"); doc.text("Asignatura:", xLabelR, y);
                    doc.setFont("helvetica", "normal"); 
                    const asignaturaLines = doc.splitTextToSize(info.asignatura, maxW_R);
                    doc.text(asignaturaLines, xValueR, y);

                    const extraHeightAsig = (asignaturaLines.length - 1) * 5; 
                    y += 8 + extraHeightAsig;
                    
                    doc.setFont("helvetica", "bold"); doc.text("Habilidad Blanda:", xLabelL, y);
                    doc.setFont("helvetica", "normal"); 
                    const habilidadLines = doc.splitTextToSize(rep.habilidad, maxW_L);
                    doc.text(habilidadLines, xValueL, y); 

                    doc.setFont("helvetica", "bold"); doc.text("Parcial:", xLabelR, y);
                    doc.setFont("helvetica", "normal"); 
                    const romanParcial = rep.parcial_asignado === '1' ? 'I' : (rep.parcial_asignado === '2' ? 'II' : rep.parcial_asignado);
                    doc.text(romanParcial, xValueR, y);

                    const extraHeightHab = (habilidadLines.length - 1) * 5;
                    y += 10 + extraHeightHab; 

                    doc.setFont("helvetica", "bold"); 
                    doc.text("Resultado de Aprendizaje:", xLabelL, y);
                    y += 5; 

                    doc.setFont("helvetica", "normal");
                    const maxW_Resultado = 180; 
                    const resultadoTexto = rep.resultado_aprendizaje || 'No definido';
                    const resultadoLines = doc.splitTextToSize(resultadoTexto, maxW_Resultado);
                    doc.text(resultadoLines, xLabelL, y);

                    const alturaResultado = resultadoLines.length * 5; 
                    y += alturaResultado + 5; 

                    const body = ests.map((e) => [e.nombre, e.n1, e.n2, e.n3, e.n4, e.n5]);

                    autoTable(doc, {
                        startY: y,
                        head: [['Estudiante', 'Nivel 1', 'Nivel 2', 'Nivel 3', 'Nivel 4', 'Nivel 5']],
                        body: body,
                        theme: 'grid', 
                        styles: { cellPadding: 1, fontSize: 9 },
                        headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: 'bold', lineWidth: 0.1, lineColor: 0 },
                        bodyStyles: { textColor: 0, lineColor: 0, lineWidth: 0.1 },
                        columnStyles: { 
                            0: { halign: 'left', cellWidth: 80 }, 
                            1: { halign: 'center' }, 2: { halign: 'center' },
                            3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center' }
                        }
                    });

                    // --- FIRMA ---
                    const finalY = doc.lastAutoTable.finalY; 
                    
                    const espacioAntesFirma = 20;    
                    const alturaBloqueFirma = 25;    
                    const margenInferiorPagina = 10; 
                    
                    let yFirma = finalY + espacioAntesFirma;

                    if (yFirma + alturaBloqueFirma > pageHeight - margenInferiorPagina) {
                        doc.addPage();
                        drawHeader(doc);
                        yFirma = 45; 
                    }
                    
                    doc.setDrawColor(0); 
                    doc.line(14, yFirma, 80, yFirma); 
                    
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(10);
                    doc.setTextColor(0);
                    
                    doc.text(info.docente, 14, yFirma + 5);
                    
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(8);
                    doc.text("DOCENTE", 14, yFirma + 9);

                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(8);
                    doc.setTextColor(100);
                    doc.text(`Generado el: ${fechaActual}`, pageWidth - 14, yFirma + 5, { align: "right" });
                }
            });

            if (paginaAgregada) doc.save(`Actas_${info.asignatura}_${selectedParalelo}.pdf`); 
            else Swal.fire('Info', 'Sin estudiantes calificados.', 'info');

        } catch (error) { 
            console.error(error); 
            if (error.response && error.response.status === 404) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Atención',
                    text: 'No se ha realizado la planificación ni evaluación para este paralelo.',
                    confirmButtonColor: '#F59E0B'
                });
            } else {
                Swal.fire('Error', 'Error al generar.', 'error'); 
            }
        } 
        finally { setLoadingIndividual(false); }
    };

    return (
        <div className="space-y-8 animate-fade-in p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center border-b border-gray-200 pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <DocumentCheckIcon className="h-8 w-8 text-blue-600"/> Fichas Resumen
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">Generación de informes para entrega de portafolio.</p>
                </div>
                <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-xl text-blue-700 font-bold border border-blue-100">
                    <CalendarDaysIcon className="h-5 w-5"/>
                    <span>{selectedPeriodo || '...'}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* OPCIÓN 1: ACTAS DE CALIFICACIÓN */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:shadow-md transition duration-300 group relative">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-500 to-teal-600 rounded-t-3xl"></div>
                    <div className="bg-green-50 p-4 rounded-full mb-6 group-hover:scale-110 transition duration-300">
                        <DocumentTextIcon className="h-10 w-10 text-green-600"/>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Actas de Calificación</h3>
                    <p className="text-gray-500 text-sm mb-4 px-4">
                        Nóminas detalladas con las calificaciones de una <strong>materia específica</strong>.
                    </p>
                    <div className="w-full mb-6 text-left relative z-10">
                        <CustomSelect 
                            label="" 
                            placeholder={opcionesMaterias.length > 0 ? "Seleccione Materia..." : "Sin materias"} 
                            options={opcionesMaterias} 
                            value={valorSelectMateria} 
                            onChange={handleCambioMateria} 
                            icon={BookOpenIcon} 
                        />
                    </div>
                    <button onClick={descargarActasIndividuales} disabled={!selectedMateriaId || loadingIndividual} className="w-full mt-auto bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-green-200 transition transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50">
                        {loadingIndividual ? 'Generando...' : <><PrinterIcon className="h-5 w-5"/> Descargar Actas</>}
                    </button>
                </div>

                {/* OPCIÓN 2: FICHA RESUMEN DE EJECUCIÓN */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:shadow-md transition duration-300 group relative">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-t-3xl"></div>
                    <div className="bg-blue-50 p-4 rounded-full mb-6 group-hover:scale-110 transition duration-300">
                        <TableCellsIcon className="h-10 w-10 text-blue-600"/>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Ficha Resumen de Ejecución</h3>
                    <p className="text-gray-500 text-sm mb-8 px-4">
                        Documento consolidado con la tabla resumen de <strong>todas sus asignaturas</strong>.
                    </p>
                    <button onClick={descargarFichaResumen} disabled={!selectedPeriodo || loadingGeneral} className="w-full mt-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-blue-200 transition transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50">
                        {loadingGeneral ? 'Generando...' : <><PrinterIcon className="h-5 w-5"/> Descargar Ficha Resumen</>}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default FichaResumen;
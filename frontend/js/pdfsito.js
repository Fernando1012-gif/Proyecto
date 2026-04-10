/* pdfsito.js - Motor de Trazabilidad UTM */

async function inicializarMotorPDF() {
    try {
        const respuesta = await fetch('pdfsito.html'); // Asegúrate que el nombre sea exacto
        const htmlMoldes = await respuesta.text();
        
        const contenedor = document.createElement('div');
        contenedor.id = 'contenedor-moldes-pdf';
        contenedor.style.position = 'absolute';
        contenedor.style.left = '-9999px'; 
        contenedor.innerHTML = htmlMoldes;
        
        document.body.appendChild(contenedor);
    } catch (error) {
        console.error("Error al cargar html:", error);
    }
}

// Función de ayuda para evitar el error de "null"
const escribirTexto = (id, valor) => {
    const el = document.getElementById(id);
    if (el) el.textContent = valor;
};

async function pdfPase(datosPase, usuario) {
    const { jsPDF } = window.jspdf;
    const u = usuario; // Usamos los datos del docente
    
    const hoy = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // Mapeo exacto a tu HTML
    escribirTexto('pdf-folio', datosPase.id.toString().padStart(4, '0'));
    escribirTexto('pdf-fecha-hoy', hoy);
    escribirTexto('pdf-dia-solicitud', datosPase.fecha_uso_h);
    escribirTexto('pdf-hora-inicio', datosPase.hora_inicio.substring(0, 5));
    escribirTexto('pdf-hora-fin', datosPase.hora_fin.substring(0, 5));
    escribirTexto('pdf-nombre-personal', u.nombre_completo);
    escribirTexto('pdf-motivo-texto', datosPase.motivo || 'COMISIÓN / PERSONAL');
    
    // Firma Vo. Bo. (Si agregas el ID al HTML como te sugiero abajo)
    escribirTexto('val-firma-vo-bo', datosPase.revisado_por_nombre || "AUTORIZADO DIGITAL");

    const elemento = document.getElementById('molde-pase-salida');
    const canvas = await html2canvas(elemento, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    
    const imgData = canvas.toDataURL('image/jpeg', 0.8);
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [216, 140] });
    pdf.addImage(imgData, 'JPEG', 5, 5, 206, 0, undefined, 'FAST');
    pdf.save(`Pase_${datosPase.id}_${u.nombre_completo.split(' ')[0]}.pdf`);
}

async function pdfPermiso(datos, usuario) {
    const { jsPDF } = window.jspdf;
    const u = usuario;

    // 1. Limpieza segura de cuadritos
    ['check-economico', 'check-sin-goce', 'check-con-goce', 'check-cumple'].forEach(id => {
        escribirTexto(id, '');
    });

    // 2. Lógica de checks
    const mesDiaPermiso = datos.fecha_inicio.substring(5, 10);
    const mesDiaCumple = u.fecha_nacimiento ? u.fecha_nacimiento.substring(5, 10) : 'XX-XX';
    
    if (mesDiaPermiso === mesDiaCumple) {
        escribirTexto('check-cumple', 'X');
    } else if (datos.tipo_permiso === 'Personal') {
        escribirTexto('check-economico', 'X');
    } else if (datos.tipo_permiso === 'Salud') {
        escribirTexto('check-con-goce', 'X');
    }

    // 3. Datos del Docente y RH
    escribirTexto('p-pdf-rector', CONFIG_SISTEMA.rector);
    escribirTexto('p-pdf-nombre-titulo', u.nombre_completo);
    escribirTexto('p-pdf-dias', datos.cantidad_dias.toString().padStart(2, '0'));
    escribirTexto('p-pdf-rango-fechas', `${datos.fecha_inicio_h} al ${datos.fecha_fin_h}`);
    escribirTexto('p-pdf-firma-trabajador', u.nombre_completo);
    escribirTexto('pdf-jefe-inmediato-nombre', datos.revisado_por_nombre || "VALIDACIÓN ELECTRÓNICA");

    escribirTexto('rh-fecha-ingreso', u.fecha_ingreso ? u.fecha_ingreso.split('T')[0] : 'S/N');
    escribirTexto('rh-area', u.area_adscripcion);
    escribirTexto('rh-categoria', u.categoria);
    escribirTexto('rh-cuatrimestre', CONFIG_SISTEMA.cuatrimestre_actual);
    escribirTexto('rh-contrato', u.tipo_contrato);
    escribirTexto('rh-rfc', u.rfc);

    // 4. Cuadro de Recepción (Sello digital)
    const recepInfo = document.getElementById('rh-recepcion-info');
    if (recepInfo && datos.fecha_revision) {
        const f = new Date(datos.fecha_revision);
        const fFmt = f.toLocaleDateString('es-MX');
        const hFmt = f.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
        recepInfo.innerHTML = `<span style="font-size: 6pt; font-weight: normal;">FECHA Y HORA DE RECEPCIÓN</span><br>${fFmt}<br>${hFmt}`;
    }

    // 5. Autoridades
    escribirTexto('p-pdf-jefe-rh', CONFIG_SISTEMA.jefe_rh);
    escribirTexto('p-pdf-delegada', CONFIG_SISTEMA.delegada_admin);

    const elemento = document.getElementById('molde-permiso-inasistencia');
    const canvas = await html2canvas(elemento, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    
    const imgData = canvas.toDataURL('image/jpeg', 0.7);
    const pdf = new jsPDF('p', 'mm', 'letter');
    pdf.addImage(imgData, 'JPEG', 0, 0, 215.9, 279.4, undefined, 'FAST');
    pdf.save(`Permiso_${u.nombre_completo.replace(/ /g, '_')}.pdf`);
}
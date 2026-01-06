import { prisma } from '../lib/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const registrarReclamacion = async (req, res) => {
    try {
        const { motivo, idEntidad, idHistorialScore, evidencia } = req.body; // 'evidencia' es el string Base64
        const idUsuario = req.usuario.id;

        let urlArchivoGuardado = null;

    // LÓGICA PARA GUARDAR ARCHIVO SIN MULTER
        if (evidencia) {
      // 1. Crear carpeta 'uploads' si no existe
            const uploadsDir = path.join(__dirname, '../../uploads'); // Ajusta la ruta según tu estructura
                if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }

        // 2. Limpiar el string base64 (quitar el prefijo "data:application/pdf;base64,")
            const matches = evidencia.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                const tipoArchivo = matches[1]; // ej: image/png
                const datosPuros = matches[2];  // El string codificado
                const buffer = Buffer.from(datosPuros, 'base64');

            // 3. Generar nombre único
                const extension = tipoArchivo.split('/')[1]; // png, pdf, jpeg
                const nombreArchivo = `evidencia-${Date.now()}-${idUsuario}.${extension}`;
                const rutaCompleta = path.join(uploadsDir, nombreArchivo);

            // 4. Escribir el archivo en disco
                fs.writeFileSync(rutaCompleta, buffer);
            
            // Guardamos la ruta relativa para la BD
                urlArchivoGuardado = `/uploads/${nombreArchivo}`;
            }
        }

    // Generar Folio
        const folio = `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Guardar en Base de Datos
        const nuevaReclamacion = await prisma.reclamacion.create({
            data: {
                folio,
                idUsuario,
                idEntidad: parseInt(idEntidad), // Asegúrate de recibir esto o sacarlo del usuario
                idHistorialScore: parseInt(idHistorialScore),
                motivo,
                evidenciaUrl: urlArchivoGuardado, // Aquí va la ruta o null
                estado: 'PENDIENTE'
            }
        });

        res.status(201).json({ mensaje: "Reclamación registrada", datos: nuevaReclamacion });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error en el servidor al registrar (EX-11-01)" });
    }
};

export const obtenerMisReclamaciones = async (req, res) => {
    try {
        const reclamaciones = await prisma.reclamacion.findMany({
            where: { idUsuario: req.usuario.id },
            orderBy: { fechaCreacion: 'desc' }
        });
        res.json(reclamaciones);
    } catch (error) {
        res.status(500).json({ error: "Error al consultar historial (EX-12-01)" });
    }
};

export const atenderReclamacion = async (req, res) => {
    try {
        const { id } = req.params;
        const { respuestaAdmin } = req.body;

        const reclamacionActualizada = await prisma.reclamacion.update({
            where: { id: parseInt(id) },
            data: {
                respuestaAdmin,
                estado: 'RESUELTO',
                fechaResolucion: new Date()
            }
        });

        res.json({ mensaje: "Reclamación resuelta", datos: reclamacionActualizada });
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar la reclamación (EX-13-01)" });
    }
};
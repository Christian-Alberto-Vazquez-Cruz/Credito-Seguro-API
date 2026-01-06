import { prisma } from '../lib/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const registrarReclamacion = async (req, res) => {
    try {
        const { motivo, idEntidad, idHistorialScore, evidencia } = req.body; 
        const idUsuario = req.usuario.id;

        let urlArchivoGuardado = null;

        if (evidencia) {
            const uploadsDir = path.join(__dirname, '../../uploads'); // Ajustar la ruta
                if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }

            const matches = evidencia.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                const tipoArchivo = matches[1]; 
                const datosPuros = matches[2];  
                const buffer = Buffer.from(datosPuros, 'base64');

                const extension = tipoArchivo.split('/')[1]; // png, pdf, jpeg
                const nombreArchivo = `evidencia-${Date.now()}-${idUsuario}.${extension}`;
                const rutaCompleta = path.join(uploadsDir, nombreArchivo);

                fs.writeFileSync(rutaCompleta, buffer);
            
                urlArchivoGuardado = `/uploads/${nombreArchivo}`;
            }
        }

        const folio = `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

        const nuevaReclamacion = await prisma.reclamacion.create({
            data: {
                folio,
                idUsuario,
                idEntidad: parseInt(idEntidad),
                idHistorialScore: parseInt(idHistorialScore),
                motivo,
                evidenciaUrl: urlArchivoGuardado,
                estado: 'PENDIENTE'
            }
        });

        res.status(201).json({ mensaje: "Reclamación registrada", datos: nuevaReclamacion });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error en el servidor al registrar" });
    }
};

export const obtenerMisReclamaciones = async (req, res) => {
    try {
        const reclamaciones = await prisma.reclamacion.findMany({
            where: { idUsuario: req.usuario.id },
            include: {
                Entidad: {
                    select: { nombreLegal: true } 
                }
            },
            orderBy: { fechaCreacion: 'desc' }
        });
        res.json(reclamaciones);
    } catch (error) {
        res.status(500).json({ error: "Error al consultar historial" });
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
        res.status(500).json({ error: "Error al actualizar la reclamación" });
    }
};

export const obtenerTodasReclamaciones = async (req, res) => {
    try {
        const reclamaciones = await prisma.reclamacion.findMany({
            include: {
                Usuario: {
                    select: { 
                        id: true, 
                        nombre: true, 
                        correo: true 
                    } 
                },
                Entidad: {
                    select: { nombreLegal: true }
                },
                HistorialScore: {
                    select: { puntajeScore: true } 
                }
            },
            orderBy: {
                fechaCreacion: 'desc' 
            }
        });

        res.json(reclamaciones);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener el listado general (EX-13-01)" });
    }
};

export const verEvidencia = async (req, res) => {
    try {
        const { nombreArchivo } = req.params;
        
        const rutaArchivo = path.join(__dirname, '../../uploads', nombreArchivo);

        if (!fs.existsSync(rutaArchivo)) {
            return res.status(404).json({ message: "El archivo no existe o fue eliminado" });
        }

        res.sendFile(rutaArchivo);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al recuperar la evidencia" });
    }
};
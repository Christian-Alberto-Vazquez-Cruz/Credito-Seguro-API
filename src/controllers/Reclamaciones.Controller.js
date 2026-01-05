import { PrismaClient } from '../lib/db.js';
const prisma = new PrismaClient();

export const registrarReclamacion = async (req, res) => {
    try {
        const { motivo, idEntidad } = req.body;
    
        const idUsuario = req.usuario.id; 

        const folio = `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

        const nuevaReclamacion = await prisma.reclamacion.create({
            data: {
                folio,
                idUsuario,
                idEntidad: parseInt(idEntidad), 
                motivo,
                estado: 'PENDIENTE'
            }
        });

        res.status(201).json({ mensaje: "Reclamación registrada", datos: nuevaReclamacion });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al registrar la reclamación" });
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
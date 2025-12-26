import {prisma} from '../lib/db.js'
import { crearConsentimientoSchema } from '../schemas/Consentimientos.Schema.js'
import { FECHA_NO_VALIDA, FECHA_VENCIMIENTO_INVALIDA } from '../utilities/Constantes.js'
import { responderConError, responderConExito } from '../utilities/Manejadores.js'

export class ConsentimientosController {

    /**
     * Crea un nuevo consentimiento de entidad (autorización al sistema)
     * Requiere: Autenticación
     * Body: { fechaVencimiento }
     */
    static async crearConsentimiento(req, res) {
        try {
            const resultadoValidacion = crearConsentimientoSchema.safeParse(req.body)

            if (!resultadoValidacion.success){
                return responderConError(res, 400, FECHA_NO_VALIDA)
            }

            const datos = resultadoValidacion.data
            const idEntidad = req.usuario.entidad.id

            const fechaInicio = new Date()

            if (datos.fechaVencimiento <= fechaInicio) {
                return responderConError(res, 400, FECHA_VENCIMIENTO_INVALIDA)
            }

            const consentimientoActivo = await prisma.consentimientoEntidad.findFirst({
                where: {
                    idEntidad: idEntidad,
                    revocado: false,
                    fechaVencimiento: {
                        gte: new Date()
                    }
                }
            })
            

            if (consentimientoActivo) {
                return responderConError(res, 409, CONSENTIMIENTO_ACTIVO_EXISTE)
            }

            const nuevoConsentimiento = await prisma.consentimientoEntidad.create({
                data: {
                    idEntidad: idEntidad,
                    fechaInicio: fechaInicio,
                    fechaVencimiento: datos.fechaVencimiento
                }
            })

            const consentimiento = {
                id: nuevoConsentimiento.id,
                fechaInicio: nuevoConsentimiento.fechaInicio,
                fechaVencimiento: nuevoConsentimiento.fechaVencimiento,
                revocado: nuevoConsentimiento.revocado

            }

            return responderConExito(res, 201, 
                'Consentimiento de entidad creado exitosamente', 
                consentimiento)

        } catch (error){
            console.error('Error al crear consentimiento de entidad:', error)
            return responderConError(res, 500, MENSAJE_ERROR_GENERICO)
        }
    }

    /**
     * Consulta un consentimiento de entidad específico por ID
     * GET /api/consentimientos-entidad/:id
     * Requiere: Autenticación
     */
    static async consultarConsentimiento(req, res) {
        try {
            const resultadoValidacion = consultarConsentimientoEntidadSchema.safeParse(req.params)

            if (!resultadoValidacion.success) {
                return responderConError(res, 400, ENTRADA_INVALIDA, {
                    errores: resultadoValidacion.error.errors.map(err => ({
                        campo: err.path.join('.'),
                        mensaje: err.message
                    }))
                })
            }

            const { id } = resultadoValidacion.data
            const idEntidad = req.usuario.entidad.id

            // Buscar consentimiento
            const consentimiento = await prisma.consentimientoEntidad.findUnique({
                where: { id }
            })

            if (!consentimiento) {
                return responderConError(res, 404, CONSENTIMIENTO_NO_ENCONTRADO)
            }

            // Verificar que pertenezca al usuario
            if (consentimiento.idEntidad !== idEntidad) {
                return responderConError(res, 403, SIN_AUTORIZACION)
            }

            // Determinar estado
            const ahora = new Date()
            const estado = consentimiento.revocado 
                ? 'REVOCADO' 
                : consentimiento.fechaVencimiento < ahora 
                    ? 'EXPIRADO' 
                    : 'ACTIVO'

            return responderConExito(res, 200, 'Consentimiento de entidad encontrado', {
                consentimiento: {
                    id: consentimiento.id,
                    fechaInicio: consentimiento.fechaInicio,
                    fechaVencimiento: consentimiento.fechaVencimiento,
                    revocado: consentimiento.revocado,
                    fechaRevocacion: consentimiento.fechaRevocacion,
                    estado: estado
                }
            })

        } catch (error) {
            console.error('Error al consultar consentimiento de entidad:', error)
            return responderConError(res, 500, MENSAJE_ERROR_GENERICO)
        }
    }
}
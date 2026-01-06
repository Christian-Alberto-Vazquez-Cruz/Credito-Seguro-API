import { ENTRADA_INVALIDA } from "./constants/Constantes.js";

export const manejarResultado = (res, respuesta) => {
    const status = respuesta.status;
    const esExitoso = status >= 200 && status < 300;

    if (esExitoso) {
        responderConExito(res, status, respuesta.mensaje, respuesta.datos);
    } else {
        responderConError(res, status, respuesta.mensaje);
    }
};

export const responderConExito = (res, status, mensaje, datos) => {
    const response = {
        error: false,
        mensaje,
        datos
    }
    
    res.status(status).json(response);
};

export const responderConError = (res, status, mensaje, datos=null) => {
    const response = {
        error: true,
        mensaje
    };

    if (datos !== null && datos !== undefined) {
        response.datos = datos;
    }

    res.status(status).json(response);
};

export const manejarErrorZod = (res, resultadoValidacion) => {
    return responderConError(res, 400, ENTRADA_INVALIDA, {
        errores: resultadoValidacion.error.issues.map(err => ({
            campo: err.path.join('.'),
            mensaje: err.message
        }))
    });
};
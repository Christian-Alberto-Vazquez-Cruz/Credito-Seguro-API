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
    res.status(status).json({
        error: false,
        mensaje,
        datos
    });
};

export const responderConError = (res, status, mensaje) => {
    res.status(status).json({
        error: true,
        mensaje
    });
};


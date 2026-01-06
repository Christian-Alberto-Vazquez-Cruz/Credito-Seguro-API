export function obtenerInicioMesActual() {
    const ahora = new Date()
    return new Date(
        Date.UTC(
            ahora.getFullYear(),
            ahora.getMonth(),
            1
        )
    )
}

export const rutaNoEncontrada = (req, res) => {
  res.status(404).json({
    error: true,
    mensaje: "Ruta o método HTTP no válido",
    metodo: req.method,
    path: req.originalUrl,
  });
};

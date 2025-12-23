import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import {prisma} from './lib/db.js'
import authRouter from  './routes/Auth.Routes.js'
import usuariosRouter from './routes/Usuarios.Routes.js'

dotenv.config()
const app = express()
app.use(cors());
app.disable('x-powered-by');

app.get("/consulta", async (req, res) => {
    res.json({
        message: "Acceso concedido",
    });
});

app.use("/auth", authRouter)
app.use("/usuarios", usuariosRouter)
app.use("/entidades", entidadesRouter)
// app.use("/consentimientos-consulta", consentimientosRouter)
// app.use("/consentimientos-entidad", consentimientoEntidad)
// app.use("/consultas", consultasRouter)
// app.use("/scores", scoresRouter)
// app.use("/notificaciones", notificacionesRouter)
// app.use("/recomendaciones", recomedacionesRouter)
// app.use("/planes", planesRouter)
// app.use("/roles", rolesRouter)
// app.use("/consumo")





app.listen(3001, () => console.log("Escuchando en el puerto 3001"))
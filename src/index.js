import {env} from './config/env.js'

import express from 'express'
import cors from 'cors'
import authRouter from  './routes/Auth.Routes.js'
import usuariosRouter from './routes/Usuarios.Routes.js'
import entidadesRouter from "./routes/Entidades.Routes.js"
import consentimientosRouter from "./routes/Consentimientos.Routes.js"
import consentimientosConsultaRouter from "./routes/ConsentiminetosConsulta.Routes.js"
import consultasHistorialRouter from "./routes/HistorialCrediticio.Routes.js"

const app = express()
app.use(cors());
app.use(express.json())
app.disable('x-powered-by');

app.get("/consulta", async (req, res) => {
    res.json({
        message: "Acceso concedido",
    });
});

app.use("/auth", authRouter)
app.use("/usuarios", usuariosRouter)
app.use("/entidades", entidadesRouter)
app.use("/consentimientos", consentimientosRouter)
app.use("/consentimientos-consulta", consentimientosConsultaRouter)
app.use("/historial-crediticio", consultasHistorialRouter)
// +¿app.use("/scores", scoresRouter)
// app.use("/notificaciones", notificacionesRouter)
// app.use("/recomendaciones", recomedacionesRouter)
// app.use("/planes", planesRouter)
// app.use("/roles", rolesRouter)
// app.use("/consumo")

app.listen(env.PORT, () => {
  console.log(`Escuchando en el puerto: ${env.PORT}`)
}) 
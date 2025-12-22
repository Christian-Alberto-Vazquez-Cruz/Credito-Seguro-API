import jwt from 'jsonwebtoken'

export const generarJWT = (payload) => {
    return new Promise((resolve, reject) => {
        jwt.sign(
            payload,
            process.env.SECRETO_JWT,
            { expiresIn: '2h' },
            (error, token) => {
                if (error) {
                    console.error('Error generando JWT:', error)
                    reject(new Error('Error al generar token'))
                } else {
                    resolve(token)
                }
            }
        )
    })
}

export const generarRefreshToken = (payload) => {
    return new Promise((resolve, reject) => {
        jwt.sign(
            payload,
            process.env.SECRETO_REFRESH_TOKEN,
            { expiresIn: '30d' },
            (error, token) => {
                if (error) {
                    console.error('Error generando refresh token:', error)
                    reject(new Error('Error al generar refresh token'))
                } else {
                    resolve(token)
                }
            }
        )
    })
}


export const verificarJWT = (token) => {
    return new Promise((resolve, reject) => {
        jwt.verify(
            token,
            process.env.SECRETO_JWT,
            (error, decoded) => {
                if (error) {
                    reject(new Error('Token inválido o expirado'))
                } else {
                    resolve(decoded)
                }
            }
        )
    })
}


export const verificarRefreshToken = (token) => {
    return new Promise((resolve, reject) => {
        jwt.verify(
            token,
            process.env.SECRETO_REFRESH_TOKEN,
            (error, decoded) => {
                if (error) {
                    reject(new Error('Refresh token inválido o expirado'))
                } else {
                    resolve(decoded)
                }
            }
        )
    })
}


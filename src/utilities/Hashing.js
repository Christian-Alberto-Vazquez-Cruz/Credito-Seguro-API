import bcrypt from 'bcrypt'
import crypto from 'crypto'

export function hashearASHA256(entrada){
    const entradaHasheada = crypto
        .createHash('sha256')
        .update(entrada)
        .digest('hex')
    return entradaHasheada
}

export async function compararContraseñaBCrypt(passwordPlana, hashAlmacenado){
    const esValida = await bcrypt.compare(
        passwordPlana,
        hashAlmacenado
    )

    return esValida
}
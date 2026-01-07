export function validarRFC(schema, rfc, ctx) {
    if (typeof rfc !== 'string' || rfc.trim() === '') {
        ctx.addIssue({
            code: 'custom',
            path: ['rfc'],
            message: 'El RFC es inválido'
        })
        return
    }

    const result = schema.safeParse(rfc)

    if (!result.success) {
        result.error.issues.forEach(issue => {
            ctx.addIssue({
                code: 'custom',
                path: ['rfc'],
                message: issue.message
            })
        })
    }
}


export function addIssue(ctx, path, message) {
    ctx.addIssue({
        code: 'custom',
        path: Array.isArray(path) ? path : [path],
        message
    })
}


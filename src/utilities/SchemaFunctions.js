export function validarRFC(schema, rfc, ctx) {
    if (typeof rfc !== 'string' || rfc.trim() === '') {
        ctx.addIssue({
<<<<<<< HEAD
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
=======
            code: "custom",
            message: result.error.issues[0].message,
            path: ['rfc']
>>>>>>> 71cd8119050b1b3b7bc58226758e4e7977cf5b4d
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


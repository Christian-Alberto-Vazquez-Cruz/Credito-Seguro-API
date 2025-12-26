export function validarRFC(schema, rfc, ctx) {
    const result = schema.safeParse(rfc)
    if (!result.success) {
        ctx.addIssue({
            code: "custom",
            message: result.error.errors[0].message,
            path: ['rfc']
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


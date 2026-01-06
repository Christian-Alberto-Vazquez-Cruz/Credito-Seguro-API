BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[ConsentimientoConsulta] (
    [id] INT NOT NULL IDENTITY(1,1),
    [idEntidadTitular] INT NOT NULL,
    [idEntidadConsultante] INT NOT NULL,
    [fechaConsentimiento] DATETIME2 CONSTRAINT [DF__Consentim__fecha__6B24EA82] DEFAULT CURRENT_TIMESTAMP,
    [fechaInicio] DATETIME2 NOT NULL,
    [fechaVencimiento] DATETIME2 NOT NULL,
    [revocado] BIT CONSTRAINT [DF__Consentim__revoc__6D0D32F4] DEFAULT 0,
    [fechaRevocacion] DATETIME2,
    [ipOrigen] NVARCHAR(45),
    [numeroConsultasRealizadas] INT CONSTRAINT [DF__Consentim__numer__6E01572D] DEFAULT 0,
    [fechaUltimaConsulta] DATETIME2,
    CONSTRAINT [PK__Consenti__3213E83FD4830C87] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ConsentimientoEntidad] (
    [id] INT NOT NULL IDENTITY(1,1),
    [idEntidad] INT NOT NULL,
    [fechaInicio] DATETIME2 NOT NULL,
    [fechaVencimiento] DATETIME2 NOT NULL,
    [revocado] BIT CONSTRAINT [DF__Consentim__revoc__6754599E] DEFAULT 0,
    [fechaRevocacion] DATETIME2,
    CONSTRAINT [PK__Consenti__3213E83FC6ECA1A5] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ConsumoEntidad] (
    [idEntidad] INT NOT NULL,
    [periodoInicio] DATE NOT NULL,
    [consultasRealizadas] INT NOT NULL CONSTRAINT [DF__ConsumoEn__consu__46E78A0C] DEFAULT 0,
    [ultimaActualizacion] DATETIME2 NOT NULL CONSTRAINT [DF__ConsumoEn__ultim__47DBAE45] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK_ConsumoEntidad] PRIMARY KEY CLUSTERED ([idEntidad],[periodoInicio])
);

-- CreateTable
CREATE TABLE [dbo].[Entidad] (
    [id] INT NOT NULL IDENTITY(1,1),
    [idPlan] INT NOT NULL,
    [tipoEntidad] NVARCHAR(10) NOT NULL,
    [nombreLegal] NVARCHAR(200) NOT NULL,
    [rfc] NVARCHAR(13) NOT NULL,
    [fechaAlta] DATETIME2 CONSTRAINT [DF__Entidad__fechaAl__403A8C7D] DEFAULT CURRENT_TIMESTAMP,
    [activo] BIT CONSTRAINT [DF__Entidad__activo__412EB0B6] DEFAULT 1,
    CONSTRAINT [PK__Entidad__3213E83FE6801F97] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UQ__Entidad__C2B03494391D38D9] UNIQUE NONCLUSTERED ([rfc])
);

-- CreateTable
CREATE TABLE [dbo].[HistorialScore] (
    [id] INT NOT NULL IDENTITY(1,1),
    [idEntidad] INT NOT NULL,
    [puntajeScore] INT NOT NULL,
    [nivelRiesgo] NVARCHAR(20) NOT NULL,
    [factoresPositivos] NVARCHAR(max),
    [factoresNegativos] NVARCHAR(max),
    [fechaCalculo] DATETIME2 CONSTRAINT [DF__Historial__fecha__534D60F1] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK__Historia__3213E83F93A87F00] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[LogConsultaTerceros] (
    [id] INT NOT NULL IDENTITY(1,1),
    [idConsentimiento] INT NOT NULL,
    [idEntidadTitular] INT NOT NULL,
    [idEntidadConsultante] INT NOT NULL,
    [idUsuarioOperador] INT NOT NULL,
    [entidadConsultante] NVARCHAR(200) NOT NULL,
    [tipoConsulta] NVARCHAR(50) NOT NULL,
    [fechaConsulta] DATETIME2 CONSTRAINT [DF__LogConsul__fecha__75A278F5] DEFAULT CURRENT_TIMESTAMP,
    [resultadoConsulta] NVARCHAR(30) NOT NULL,
    [ipOrigen] NVARCHAR(45),
    CONSTRAINT [PK__LogConsu__3213E83F8B4ABF0D] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Notificacion] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tipoNotificacion] NVARCHAR(50) NOT NULL,
    [idUsuario] INT NOT NULL,
    [titulo] NVARCHAR(200) NOT NULL,
    [mensaje] NVARCHAR(max) NOT NULL,
    [hora] DATETIME2 CONSTRAINT [DF__Notificaci__hora__619B8048] DEFAULT CURRENT_TIMESTAMP,
    [visto] BIT CONSTRAINT [DF__Notificac__visto__628FA481] DEFAULT 0,
    CONSTRAINT [PK__Notifica__3213E83FAF3D6CFF] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[PlanSuscripcion] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tipoPlan] NVARCHAR(30) NOT NULL,
    [maxConsultasMensuales] INT NOT NULL,
    CONSTRAINT [PK__PlanSusc__3213E83F2804A5E9] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UQ__PlanSusc__A7343DAD3D67C48B] UNIQUE NONCLUSTERED ([tipoPlan])
);

-- CreateTable
CREATE TABLE [dbo].[Recomendacion] (
    [id] INT NOT NULL IDENTITY(1,1),
    [idUsuario] INT NOT NULL,
    [tipoRecomendacion] NVARCHAR(50) NOT NULL,
    [titulo] NVARCHAR(200) NOT NULL,
    [descripcion] NVARCHAR(max) NOT NULL,
    [impactoEstimado] NVARCHAR(20),
    [prioridad] INT CONSTRAINT [DF__Recomenda__prior__59063A47] DEFAULT 1,
    [estado] NVARCHAR(30) CONSTRAINT [DF__Recomenda__estad__59FA5E80] DEFAULT 'PENDIENTE',
    [fechaCreacion] DATETIME2 CONSTRAINT [DF__Recomenda__fecha__5AEE82B9] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [PK__Recomend__3213E83FA10E3967] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[RefreshToken] (
    [id] INT NOT NULL IDENTITY(1,1),
    [idUsuario] INT NOT NULL,
    [tokenHash] NVARCHAR(64) NOT NULL,
    [horaCreacion] DATETIME2 CONSTRAINT [DF__RefreshTo__horaC__7D439ABD] DEFAULT CURRENT_TIMESTAMP,
    [horaExpiracion] DATETIME2 NOT NULL,
    [revocado] BIT CONSTRAINT [DF__RefreshTo__revoc__7E37BEF6] DEFAULT 0,
    [ipOrigen] NVARCHAR(45),
    CONSTRAINT [PK__RefreshT__3213E83F98106A0A] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UQ__RefreshT__9015C60EFF792458] UNIQUE NONCLUSTERED ([tokenHash])
);

-- CreateTable
CREATE TABLE [dbo].[Rol] (
    [id] INT NOT NULL IDENTITY(1,1),
    [nombreRol] NVARCHAR(30) NOT NULL,
    CONSTRAINT [PK__Rol__3213E83FF7D0DADF] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UQ__Rol__2787B00CB8BFD9EE] UNIQUE NONCLUSTERED ([nombreRol])
);

-- CreateTable
CREATE TABLE [dbo].[Usuario] (
    [id] INT NOT NULL IDENTITY(1,1),
    [idEntidad] INT NOT NULL,
    [idRol] INT NOT NULL,
    [nombre] NVARCHAR(100) NOT NULL,
    [correo] NVARCHAR(255) NOT NULL,
    [fechaCreacion] DATETIME2 CONSTRAINT [DF__Usuario__fechaCr__4CA06362] DEFAULT CURRENT_TIMESTAMP,
    [activo] BIT CONSTRAINT [DF__Usuario__activo__4D94879B] DEFAULT 1,
    [notificacionesActivas] BIT CONSTRAINT [DF__Usuario__notific__4E88ABD4] DEFAULT 1,
    [contraseniaHash] VARCHAR(255) NOT NULL,
    CONSTRAINT [PK__Usuario__3213E83FFBCAD551] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UQ__Usuario__2A586E0BB8CB9E0E] UNIQUE NONCLUSTERED ([correo])
);

-- CreateTable
CREATE TABLE [dbo].[Reclamacion] (
    [id] INT NOT NULL IDENTITY(1,1),
    [folio] NVARCHAR(20) NOT NULL,
    [idUsuario] INT NOT NULL,
    [idEntidad] INT NOT NULL,
    [motivo] NVARCHAR(max) NOT NULL,
    [estado] NVARCHAR(30) NOT NULL CONSTRAINT [Reclamacion_estado_df] DEFAULT 'PENDIENTE',
    [respuestaAdmin] NVARCHAR(max),
    [fechaCreacion] DATETIME2 CONSTRAINT [Reclamacion_fechaCreacion_df] DEFAULT CURRENT_TIMESTAMP,
    [fechaResolucion] DATETIME2,
    CONSTRAINT [Reclamacion_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Reclamacion_folio_key] UNIQUE NONCLUSTERED ([folio])
);

-- AddForeignKey
ALTER TABLE [dbo].[ConsentimientoConsulta] ADD CONSTRAINT [FK_ConsentimientoConsulta_Usuario] FOREIGN KEY ([idEntidadTitular]) REFERENCES [dbo].[Entidad]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ConsentimientoConsulta] ADD CONSTRAINT [FK_ConsentimientoConsulta_UsuarioEntidad] FOREIGN KEY ([idEntidadConsultante]) REFERENCES [dbo].[Entidad]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ConsentimientoEntidad] ADD CONSTRAINT [FK_Consentimiento_Entidad] FOREIGN KEY ([idEntidad]) REFERENCES [dbo].[Entidad]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ConsumoEntidad] ADD CONSTRAINT [FK_ConsumoEntidad_Entidad] FOREIGN KEY ([idEntidad]) REFERENCES [dbo].[Entidad]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Entidad] ADD CONSTRAINT [FK_Entidad_IdPlan] FOREIGN KEY ([idPlan]) REFERENCES [dbo].[PlanSuscripcion]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[HistorialScore] ADD CONSTRAINT [FK_HistorialScore_Entidad] FOREIGN KEY ([idEntidad]) REFERENCES [dbo].[Entidad]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[LogConsultaTerceros] ADD CONSTRAINT [FK_LogConsulta_Consentimiento] FOREIGN KEY ([idConsentimiento]) REFERENCES [dbo].[ConsentimientoConsulta]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[LogConsultaTerceros] ADD CONSTRAINT [FK_LogConsulta_Usuario] FOREIGN KEY ([idEntidadTitular]) REFERENCES [dbo].[Entidad]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[LogConsultaTerceros] ADD CONSTRAINT [FK_LogConsulta_UsuarioOperador] FOREIGN KEY ([idUsuarioOperador]) REFERENCES [dbo].[Usuario]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Notificacion] ADD CONSTRAINT [FK_Notificacion_Usuario] FOREIGN KEY ([idUsuario]) REFERENCES [dbo].[Usuario]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Recomendacion] ADD CONSTRAINT [FK_Recomendacion_Usuario] FOREIGN KEY ([idUsuario]) REFERENCES [dbo].[Usuario]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RefreshToken] ADD CONSTRAINT [FK_RefreshToken_Usuario] FOREIGN KEY ([idUsuario]) REFERENCES [dbo].[Usuario]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Usuario] ADD CONSTRAINT [FK_Usuario_Entidad] FOREIGN KEY ([idEntidad]) REFERENCES [dbo].[Entidad]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Usuario] ADD CONSTRAINT [FK_Usuario_Rol] FOREIGN KEY ([idRol]) REFERENCES [dbo].[Rol]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Reclamacion] ADD CONSTRAINT [FK_Reclamacion_Usuario] FOREIGN KEY ([idUsuario]) REFERENCES [dbo].[Usuario]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Reclamacion] ADD CONSTRAINT [FK_Reclamacion_Entidad] FOREIGN KEY ([idEntidad]) REFERENCES [dbo].[Entidad]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

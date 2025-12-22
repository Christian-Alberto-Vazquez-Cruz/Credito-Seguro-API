-- ==========================================
-- BASE DE DATOS: CreditoSeguro
-- ==========================================

IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'CreditoSeguro')
BEGIN
    CREATE DATABASE CreditoSeguro;
END
GO

USE CreditoSeguro;
GO


CREATE TABLE Rol (
    id INT IDENTITY(1,1) PRIMARY KEY,
    nombreRol NVARCHAR(30) UNIQUE NOT NULL,

    CONSTRAINT CHK_Rol_NombreRol
        CHECK (nombreRol IN ('USUARIO', 'ADMINISTRADOR'))
);
GO

CREATE TABLE PlanSuscripcion(
    id INT IDENTITY(1,1) PRIMARY KEY,
    tipoPlan NVARCHAR(30) UNIQUE NOT NULL,
    maxConsultasMensuales INT NOT NULL,

    CONSTRAINT CHK_Plan_TipoPlan
        Check (tipoPlan IN ('REGULAR', 'PREMIUM'))
); 
GO

CREATE TABLE Entidad (
    id INT IDENTITY(1,1) PRIMARY KEY,
    idPlan INT NOT NULL,
    tipoEntidad NVARCHAR(10) NOT NULL,
    nombreLegal NVARCHAR(200) NOT NULL,
    rfc NVARCHAR(13) NOT NULL UNIQUE,
    fechaAlta DATETIME2 DEFAULT GETDATE(),
    activo BIT DEFAULT 1,

    CONSTRAINT FK_Entidad_IdPlan
        FOREIGN KEY (idPlan) REFERENCES PlanSuscripcion(id),
    
    CONSTRAINT CHK_Entidad_TipoEntidad
        CHECK (tipoEntidad IN ('FISICA', 'MORAL')),

    CONSTRAINT CHK_Entidad_RFC
        CHECK (
            (tipoEntidad = 'FISICA' AND LEN(rfc) = 13) OR
            (tipoEntidad = 'MORAL' AND LEN(rfc) = 12)
        )
    

);
GO

CREATE TABLE ConsumoEntidad(
    idEntidad INT NOT NULL,
    periodoInicio DATE NOT NULL,
    consultasRealizadas INT NOT NULL DEFAULT 0,
    ultimaActualizacion DATETIME2 NOT NULL DEFAULT GETDATE(),

    CONSTRAINT PK_ConsumoEntidad
        PRIMARY KEY (idEntidad, periodoInicio),

    CONSTRAINT FK_ConsumoEntidad_Entidad
        FOREIGN KEY (idEntidad) REFERENCES Entidad(id)
);
GO

CREATE TABLE Usuario (
    id INT IDENTITY(1,1) PRIMARY KEY,
    idEntidad INT NOT NULL,
    idRol INT NOT NULL,
    nombre NVARCHAR(100) NOT NULL,
    correo NVARCHAR(255) NOT NULL UNIQUE,

    fechaCreacion DATETIME2 DEFAULT GETDATE(),
    activo BIT DEFAULT 1,
    notificacionesActivas BIT DEFAULT 1,
        
    CONSTRAINT FK_Usuario_Entidad
        FOREIGN KEY (idEntidad) REFERENCES Entidad(id),

    CONSTRAINT FK_Usuario_Rol
        FOREIGN KEY (idRol) REFERENCES Rol(id)

);
GO

CREATE TABLE HistorialScore (
    id INT IDENTITY(1,1) PRIMARY KEY,
    idEntidad INT NOT NULL,
    puntajeScore INT NOT NULL,
    nivelRiesgo NVARCHAR(20) NOT NULL,
    factoresPositivos NVARCHAR(MAX),
    factoresNegativos NVARCHAR(MAX),
    fechaCalculo DATETIME2 DEFAULT GETDATE(),
    
    CONSTRAINT FK_HistorialScore_Entidad
        FOREIGN KEY (idEntidad) REFERENCES Entidad(id) ON DELETE CASCADE,

    CONSTRAINT CHK_HistorialScore_Puntaje CHECK (puntajeScore BETWEEN 300 AND 850),
    CONSTRAINT CHK_HistorialScore_Riesgo CHECK (nivelRiesgo IN ('EXCELENTE', 'MUY_BUENO', 'BUENO', 'REGULAR', 'MALO', 'MUY_MALO'))

);
GO

CREATE TABLE Recomendacion (
    id INT IDENTITY(1,1) PRIMARY KEY,
    idUsuario INT NOT NULL,
    tipoRecomendacion NVARCHAR(50) NOT NULL,
    titulo NVARCHAR(200) NOT NULL,
    descripcion NVARCHAR(MAX) NOT NULL,
    impactoEstimado NVARCHAR(20), 
    prioridad INT DEFAULT 1, 
    estado NVARCHAR(30) DEFAULT 'PENDIENTE',
    fechaCreacion DATETIME2 DEFAULT GETDATE(),

    CONSTRAINT FK_Recomendacion_Usuario 
        FOREIGN KEY (idUsuario) REFERENCES Usuario(id) ON DELETE CASCADE,

    CONSTRAINT CHK_Recomendacion_Estado CHECK (estado IN ('PENDIENTE', 'EN_PROGRESO', 'COMPLETADA', 'DESCARTADA')),
    CONSTRAINT CHK_Recomendacion_Impacto CHECK (impactoEstimado IN ('BAJO', 'MEDIO', 'ALTO')),
    CONSTRAINT CHK_Recomendacion_Prioridad CHECK (prioridad BETWEEN 1 AND 3)
);
GO

CREATE TABLE Notificacion (
    id INT IDENTITY(1,1) PRIMARY KEY,
    tipoNotificacion NVARCHAR(50) NOT NULL,
    idUsuario INT NOT NULL,
    titulo NVARCHAR(200) NOT NULL,
    mensaje NVARCHAR(MAX) NOT NULL,
    hora DATETIME2 DEFAULT GETDATE(),
    visto BIT DEFAULT 0,

    CONSTRAINT FK_Notificacion_Usuario 
        FOREIGN KEY (idUsuario) REFERENCES Usuario(id) ON DELETE CASCADE,

    CONSTRAINT CHK_Notificacion_Tipo 
        CHECK (tipoNotificacion IN (
            'SCORE_ACTUALIZADO',
            'NUEVA_RECOMENDACION',
            'ALERTA_PAGO',
            'MEJORA_SCORE',
            'DISMINUCION_SCORE',
            'RECORDATORIO_PREMIUM',
            'SISTEMA'
        ))

);
GO

CREATE TABLE ConsentimientoEntidad (
    id INT IDENTITY(1,1) PRIMARY KEY,
    idEntidad INT NOT NULL,
    finalidad NVARCHAR(200) NOT NULL, 
    fechaConsentimiento DATETIME2 NOT NULL,
    vigenciaConsentimiento DATETIME2 NOT NULL,
    revocado BIT DEFAULT 0,
    fechaRevocacion DATETIME2,
    
    CONSTRAINT FK_Consentimiento_Entidad
        FOREIGN KEY (idEntidad) REFERENCES Entidad(id) ON DELETE CASCADE
);
GO

CREATE TABLE ConsentimientoConsulta (
    id INT IDENTITY(1,1) PRIMARY KEY,
    idEntidadTitular INT NOT NULL,
    idEntidadConsultante INT NOT NULL,
    
    tipoInformacion NVARCHAR(50) NOT NULL, -- 'SCORE_COMPLETO', 'SCORE_BASICO', 'HISTORIAL'
    fechaConsentimiento DATETIME2 DEFAULT GETDATE(),
    fechaInicio DATETIME2 NOT NULL,
    fechaVencimiento DATETIME2 NOT NULL,
    estadoConsentimiento NVARCHAR(20) DEFAULT 'ACTIVO',
    revocado BIT DEFAULT 0,
    fechaRevocacion DATETIME2,    
    ipOrigen NVARCHAR(45),
    numeroConsultasRealizadas INT DEFAULT 0,
    fechaUltimaConsulta DATETIME2,
    
    CONSTRAINT FK_ConsentimientoConsulta_Usuario 
        FOREIGN KEY (idEntidadTitular) REFERENCES Entidad(id) ON DELETE CASCADE,
    
    CONSTRAINT FK_ConsentimientoConsulta_UsuarioEntidad
        FOREIGN KEY (idEntidadConsultante) REFERENCES Entidad(id) ON DELETE NO ACTION,
    
    CONSTRAINT CHK_ConsentimientoConsulta_Fechas 
        CHECK (fechaVencimiento > fechaInicio),
    
    CONSTRAINT CHK_ConsentimientoConsulta_Estado 
        CHECK (estadoConsentimiento IN ('ACTIVO', 'EXPIRADO', 'REVOCADO', 'PAUSADO')),
        
    CONSTRAINT CHK_ConsentimientoConsulta_Tipo
        CHECK (tipoInformacion IN (
            'SCORE_COMPLETO',      -- Score + factores + recomendaciones
            'SCORE_BASICO',        -- Solo puntaje y nivel de riesgo
            'HISTORIAL_RESUMIDO',  -- Resumen crediticio
            'HISTORIAL_COMPLETO'   -- Todo el detalle
        ))
);
GO

CREATE TABLE LogConsultaTerceros (
    id INT IDENTITY(1,1) PRIMARY KEY,
    idConsentimiento INT NOT NULL,
    idEntidadTitular INT NOT NULL,
    idEntidadConsultante INT NOT NULL,
    idUsuarioOperador INT NOT NULL, 
    entidadConsultante NVARCHAR(200) NOT NULL,
    tipoConsulta NVARCHAR(50) NOT NULL,    
    fechaConsulta DATETIME2 DEFAULT GETDATE(),
    resultadoConsulta NVARCHAR(30) NOT NULL,
    ipOrigen NVARCHAR(45),
    
    
    CONSTRAINT FK_LogConsulta_Consentimiento 
        FOREIGN KEY (idConsentimiento) REFERENCES ConsentimientoConsulta(id),
    
    CONSTRAINT FK_LogConsulta_Usuario 
        FOREIGN KEY (idEntidadTitular) REFERENCES Entidad(id),
    
    CONSTRAINT FK_LogConsulta_UsuarioOperador
        FOREIGN KEY (idUsuarioOperador) REFERENCES Usuario(id),

    CONSTRAINT CHK_LogConsulta_Resultado
        CHECK (resultadoConsulta IN (
            'EXITOSO',
            'DENEGADO_SIN_CONSENTIMIENTO',
            'DENEGADO_EXPIRADO',
            'DENEGADO_REVOCADO',
            'ERROR_SISTEMA'
        ))
);
GO

CREATE TABLE RefreshToken (
    id INT IDENTITY(1,1) PRIMARY KEY,
    idUsuario INT NOT NULL,
    tokenHash NVARCHAR(64) NOT NULL UNIQUE,
    horaCreacion DATETIME2 DEFAULT GETDATE(),
    horaExpiracion DATETIME2 NOT NULL,
    revocado BIT DEFAULT 0,
    ipOrigen NVARCHAR(45),

    CONSTRAINT FK_RefreshToken_Usuario 
        FOREIGN KEY (idUsuario) REFERENCES Usuario(id) ON DELETE CASCADE,

    CONSTRAINT CHK_RefreshToken_Expiracion CHECK (horaExpiracion > horaCreacion),
    CONSTRAINT CHK_RefreshToken_Hash CHECK (LEN(tokenHash) = 64)
);
GO


-- ==========================================
-- Roles 
-- ==========================================
CREATE ROLE rol_consulta_readonly;
CREATE ROLE rol_escritura;

-- Permisos readonly --
GRANT SELECT ON SCHEMA::dbo TO rol_consulta_readonly;
GO

-- Permisos escritura --
GRANT INSERT ON SCHEMA::dbo TO rol_escritura;
REVOKE INSERT ON rol FROM rol_Escritura;
GO

-- ==========================================
-- Usuarios y asignación de roles
-- ==========================================

-- cs_usuario - - 
IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = 'cs_usuario')
    CREATE LOGIN cs_usuario WITH PASSWORD = 'cs_usuario';
GO

IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'cs_usuario')
    CREATE USER cs_usuario FOR LOGIN cs_usuario;
GO

EXEC sp_addrolemember 'rol_consulta_readonly', 'cs_usuario';
EXEC sp_addrolemember 'rol_escritura', 'cs_usuario';
GO

-- auditor --
IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = 'cs_auditor')
    CREATE LOGIN cs_auditor WITH PASSWORD = 'cs_auditor';
GO

IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'cs_auditor')
    CREATE USER cs_auditor FOR LOGIN cs_auditor;
GO

EXEC sp_addrolemember 'rol_consulta_readonly', 'cs_auditor';
GO
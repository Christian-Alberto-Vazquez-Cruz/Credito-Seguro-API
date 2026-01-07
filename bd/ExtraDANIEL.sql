USE CreditoSeguro;
GO

CREATE TABLE Reclamacion (
  id INT IDENTITY(1,1) PRIMARY KEY,
  folio NVARCHAR(20) NOT NULL UNIQUE,

  idUsuario INT NOT NULL,
  idEntidad INT NOT NULL,
  idHistorialScore INT NULL,

  evidenciaUrl NVARCHAR(500) NULL,
  motivo NVARCHAR(MAX) NOT NULL,
  estado NVARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
  respuestaAdmin NVARCHAR(MAX) NULL,

  fechaCreacion DATETIME2 NOT NULL DEFAULT GETDATE(),
  fechaResolucion DATETIME2 NULL,

  CONSTRAINT FK_Reclamacion_Usuario
    FOREIGN KEY (idUsuario) REFERENCES Usuario(id) ON DELETE CASCADE,

  CONSTRAINT FK_Reclamacion_Entidad
    FOREIGN KEY (idEntidad) REFERENCES Entidad(id) ON DELETE CASCADE,

  CONSTRAINT FK_Reclamacion_Historial
    FOREIGN KEY (idHistorialScore) REFERENCES HistorialScore(id)
);
GO

USE CreditoSeguro;
GO

INSERT INTO Rol (nombreRol) VALUES 
    ('USUARIO'),
    ('ADMINISTRADOR');
GO


INSERT INTO PlanSuscripcion (tipoPlan, maxConsultasMensuales) VALUES 
    ('REGULAR', 50),
    ('PREMIUM', 500);
GO

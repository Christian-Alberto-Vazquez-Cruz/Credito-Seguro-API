BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Reclamacion] ADD [evidenciaUrl] NVARCHAR(500),
[idHistorialScore] INT;

-- AddForeignKey
ALTER TABLE [dbo].[Reclamacion] ADD CONSTRAINT [FK_Reclamacion_Historial] FOREIGN KEY ([idHistorialScore]) REFERENCES [dbo].[HistorialScore]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

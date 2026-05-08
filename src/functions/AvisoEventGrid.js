const { app, output } = require('@azure/functions');
const { BlobServiceClient } = require('@azure/storage-blob');

const signalR = output.generic({
    type: 'signalR',
    name: 'signalRMessages',
    hubName: 'trafficHub',
    connectionStringSetting: 'AzureSignalRConnectionString'
});

app.eventGrid('AvisoEventGrid', {
    extraOutputs: [signalR],
    handler: async (event, context) => {
        try {
            const blobUrl = event.data.url;
            context.log(`🔔 Procesando actualización de: ${blobUrl}`);

            // Conexión al Storage usando la variable de entorno que configuramos
            const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.storetrafficosub_STORAGE);
            
            // Parsear la URL para obtener contenedor y nombre
            const urlParts = new URL(blobUrl);
            const pathParts = urlParts.pathname.split('/').filter(p => p);
            const containerName = pathParts[0];
            const blobName = pathParts.slice(1).join('/');

            const containerClient = blobServiceClient.getContainerClient(containerName);
            const blobClient = containerClient.getBlobClient(blobName);

            // Descargar el contenido del archivo
            const downloadResponse = await blobClient.download();
            const content = (await streamToBuffer(downloadResponse.readableStreamBody)).toString();
            
            // Separar por líneas y limpiar vacíos
            const lines = content.split('\n').filter(line => line.trim());

            // --- LÓGICA REALISTA: SOLO LA ÚLTIMA ALERTA ---
            if (lines.length > 0) {
                const lastLine = lines[lines.length - 1];
                const data = JSON.parse(lastLine);
                
                // Redondeamos la velocidad para que se vea mejor (ej: 17.66 -> 18)
                const velocidadLimpia = Math.round(data.velocidadPromedio || 0);

                const mensaje = [{
                    target: 'newMessage',
                    arguments: [{
                        sensor: data.sensorId || "Sensor-TDeA",
                        velocidad: velocidadLimpia,
                        timestamp: data.tiempoAlerta || new Date().toISOString()
                    }]
                }];

                context.extraOutputs.set(signalR, mensaje);
                context.log(`✅ Alerta enviada: ${velocidadLimpia} km/h`);
            }

        } catch (error) {
            context.log.error("Error en el flujo de Event Grid:", error);
        }
    }
});

// Función auxiliar indispensable para leer archivos de Azure Storage
async function streamToBuffer(readableStream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        readableStream.on("data", (data) => chunks.push(data instanceof Buffer ? data : Buffer.from(data)));
        readableStream.on("end", () => resolve(Buffer.concat(chunks)));
        readableStream.on("error", reject);
    });
}
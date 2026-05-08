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
            const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.storetrafficosub_STORAGE);
            
            const urlParts = new URL(blobUrl);
            const pathParts = urlParts.pathname.split('/').filter(p => p);
            const containerName = pathParts[0];
            const blobName = pathParts.slice(1).join('/');

            const containerClient = blobServiceClient.getContainerClient(containerName);
            const blobClient = containerClient.getBlobClient(blobName);

            const downloadResponse = await blobClient.download();
            const content = (await streamToBuffer(downloadResponse.readableStreamBody)).toString();
            
            const lines = content.split('\n').filter(line => line.trim());

            if (lines.length > 0) {
                const lastLine = lines[lines.length - 1];
                const data = JSON.parse(lastLine);
                
                const velocidadLimpia = Math.round(data.velocidadPromedio || 0);

                // ENVIAMOS LATITUD Y LONGITUD
                const mensaje = [{
                    target: 'newMessage',
                    arguments: [{
                        sensor: data.sensorId || "Sensor-TDeA",
                        velocidad: velocidadLimpia,
                        lat: data.location ? data.location.lat : "N/A",
                        lng: data.location ? data.location.lng : "N/A",
                        timestamp: data.tiempoAlerta || new Date().toISOString()
                    }]
                }];

                context.extraOutputs.set(signalR, mensaje);
                context.log(`✅ Alerta con ubicación enviada: ${velocidadLimpia} km/h`);
            }

        } catch (error) {
            context.log.error("Error en el flujo:", error);
        }
    }
});

async function streamToBuffer(readableStream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        readableStream.on("data", (data) => chunks.push(data instanceof Buffer ? data : Buffer.from(data)));
        readableStream.on("end", () => resolve(Buffer.concat(chunks)));
        readableStream.on("error", reject);
    });
}
const { app } = require('@azure/functions');

app.storageBlob('ProcesarAlerta', {
    path: 'alertas-trafico/{name}',
    connection: 'storetrafficosub_STORAGE',
    handler: (blob, context) => {
        try {
            const data = JSON.parse(blob.toString());

            context.log(`-----------------------------------------`);
            context.log(`ALERTA DETECTADA EN: ${context.triggerMetadata.name}`);
            
            // Usamos los nombres de campos que vienen de tu simulador/Stream Analytics
            // Agregamos un fallback (||) por si Stream Analytics renombró los campos
            const id = data.sensorId || data.deviceId || "ID Desconocido";
            const vel = data.velocidad || data.averageSpeed || "N/A";
            
            context.log(`ID del Sensor: ${id}`);
            context.log(`Velocidad: ${vel} km/h`);
            
            if (data.location) {
                context.log(`Coordenadas: Lat ${data.location.lat}, Lng ${data.location.lng}`);
            }
            
            context.log(`-----------------------------------------`);

        } catch (error) {
            context.log.error("Error al procesar el JSON de la alerta:", error);
        }
    }
});
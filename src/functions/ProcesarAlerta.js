const { app, output } = require('@azure/functions');

const signalR = output.generic({
    type: 'signalR',
    name: 'signalRMessages',
    hubName: 'trafficHub',
    connectionStringSetting: 'AzureSignalRConnectionString'
});

app.storageBlob('ProcesarAlerta', {
    path: 'alertas-trafico/{name}',
    connection: 'storetrafficosub_STORAGE',
    extraOutputs: [signalR],
    handler: (blob, context) => {
        try {
            // El archivo tiene múltiples líneas JSON, tomamos la primera
            const content = blob.toString().split('\n')[0];
            const data = JSON.parse(content);
            
            const alertaInfo = {
                sensor: data.sensorId || "Desconocido",
                velocidad: data.velocidadPromedio || 0, // <--- CAMBIADO A velocidadPromedio
                timestamp: data.tiempoAlerta || new Date().toISOString() // <--- CAMBIADO A tiempoAlerta
            };

            context.log(`🚨 Enviando a SignalR: Sensor ${alertaInfo.sensor} - Vel: ${alertaInfo.velocidad}`);

            context.extraOutputs.set(signalR, [{
                target: 'newMessage',
                arguments: [alertaInfo]
            }]);

        } catch (error) {
            context.log.error("Error procesando el JSON del blob:", error);
        }
    }
});
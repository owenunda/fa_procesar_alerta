const { app, output } = require('@azure/functions');

// 1. Definimos la salida hacia SignalR
const signalR = output.generic({
    type: 'signalR',
    name: 'signalRMessages',
    hubName: 'trafficHub',
    connectionStringSetting: 'AzureSignalRConnectionString'
});

app.storageBlob('ProcesarAlerta', {
    path: 'alertas-trafico/{name}',
    connection: 'storetrafficosub_STORAGE',
    extraOutputs: [signalR], // 2. Conectamos la salida
    handler: (blob, context) => {
        try {
            const data = JSON.parse(blob.toString());
            
            // Mapeamos los datos que vienen de tu simulador
            const alertaInfo = {
                sensor: data.sensorId || "Desconocido",
                velocidad: data.velocidad || 0,
                timestamp: data.timestamp || new Date().toISOString()
            };

            context.log(`🚨 Enviando alerta a SignalR: Sensor ${alertaInfo.sensor}`);

            // 3. Enviamos el mensaje al Dashboard
            context.extraOutputs.set(signalR, [{
                target: 'newMessage',
                arguments: [alertaInfo]
            }]);

        } catch (error) {
            context.log.error("Error procesando alerta:", error);
        }
    }
});
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
            const content = blob.toString().trim();
            // Si el archivo tiene múltiples líneas, las procesamos todas
            const lines = content.split('\n');
            
            lines.forEach(line => {
                if (line.trim()) {
                    const data = JSON.parse(line);
                    
                    const alertaInfo = {
                        sensor: data.sensorId || "Sensor-TDeA",
                        velocidad: data.velocidadPromedio || 0,
                        timestamp: data.tiempoAlerta || new Date().toISOString()
                    };

                    context.log(`Alerta procesada: ${alertaInfo.sensor} a ${alertaInfo.velocidad}km/h`);

                    context.extraOutputs.set(signalR, [{
                        target: 'newMessage',
                        arguments: [alertaInfo]
                    }]);
                }
            });
        } catch (error) {
            context.log.error("Error detallado:", error);
        }
    } 
});
const { app } = require('@azure/functions');
const df = require('durable-functions');
const Mqtt = require('azure-iot-device-mqtt').Mqtt;
const DeviceClient = require('azure-iot-device').Client;
const Message = require('azure-iot-device').Message;

const puntosCongestionMedellin = [
    { latitud: 6.2889, longitud: -75.5647 },
    { latitud: 6.2108, longitud: -75.5735 },
    { latitud: 6.2764, longitud: -75.5702 },
    { latitud: 6.2081, longitud: -75.5653 },
    { latitud: 6.2476, longitud: -75.5689 },
    { latitud: 6.2452, longitud: -75.5774 },
    { latitud: 6.2301, longitud: -75.5983 },
    { latitud: 6.2448, longitud: -75.5941 },
    { latitud: 6.2245, longitud: -75.6017 },
    { latitud: 6.2519, longitud: -75.5698 }
];

df.app.activity('runSimulator', {
    handler: async (input, context) => {
        const connectionString = process.env.IotHubConnectionString;
        if (!connectionString) {
            throw new Error('IotHubConnectionString no está configurada.');
        }

        const client = DeviceClient.fromConnectionString(connectionString, Mqtt);
        
        // input.durationMinutes vendrá del orquestador (3 minutos)
        const durationMs = (input.durationMinutes || 3) * 60 * 1000; 
        const startTime = Date.now();

        context.log(`Simulador de tráfico iniciado por ${input.durationMinutes} minutos...`);

        // Este bucle se ejecutará exactamente durante el tiempo definido
        while (Date.now() - startTime < durationMs) {
            const puntoAleatorio = puntosCongestionMedellin[Math.floor(Math.random() * puntosCongestionMedellin.length)];
            const velocidad = Math.floor(Math.random() * (15 - 5) + 5);
            const datos = JSON.stringify({
                sensorId: 'sensor-tdea-01',
                velocidad: velocidad,
                location: {
                    lat: puntoAleatorio.latitud,
                    lng: puntoAleatorio.longitud
                },
                timestamp: new Date().toISOString()
            });

            const mensaje = new Message(datos);

            try {
                await client.sendEvent(mensaje);
                context.log(`[Simulador] Enviado: ${datos}`);
            } catch (err) {
                context.log.error(`[Simulador] Error al enviar: ${err.toString()}`);
            }

            // Esperar 3 segundos antes del siguiente ciclo
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        context.log("Tiempo de simulación finalizado.");
        return "Simulación completada";
    }
});
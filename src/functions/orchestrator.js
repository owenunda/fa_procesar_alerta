const { app } = require('@azure/functions');
const df = require('durable-functions');

df.app.orchestration('systemOrchestrator', function* (context) {
    // 1. Enciende Stream Analytics
    yield context.df.callActivity('toggleSystem', 'START');

    // 2. Ejecuta el simulador inyectando datos por 3 minutos exactos
    // El orquestador se quedará esperando aquí hasta que la actividad termine
    yield context.df.callActivity('runSimulator', { durationMinutes: 3 });

    // 3. Apaga Stream Analytics al terminar
    yield context.df.callActivity('toggleSystem', 'STOP');
});
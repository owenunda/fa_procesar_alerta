const { app } = require('@azure/functions');
const df = require('durable-functions');

// Cambiado de app.orchestration a df.app.orchestration
df.app.orchestration('systemOrchestrator', function* (context) {
    // 1. Ejecutar el encendido
    yield context.df.callActivity('toggleSystem', 'START');

    // 2. Dormir exactamente 3 minutos
    const deadline = new Date(context.df.currentUtcDateTime.getTime() + 3 * 60000);
    yield context.df.createTimer(deadline);

    // 3. Ejecutar el apagado
    yield context.df.callActivity('toggleSystem', 'STOP');
});
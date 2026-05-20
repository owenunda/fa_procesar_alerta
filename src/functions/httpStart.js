// src/functions/httpStart.js
const { app } = require('@azure/functions');
const df = require('durable-functions');
const { TableClient } = require("@azure/data-tables");

app.http('startSystem', {
    route: 'start',
    extraInputs: [df.input.durableClient()],
    handler: async (request, context) => {
        const client = df.getClient(context);

        // Conexión a Table Storage para leer el estado
        const tableClient = TableClient.fromConnectionString(process.env.AzureWebJobsStorage, "SystemState");
        let state;
        try {
            state = await tableClient.getEntity("Control", "Cooldown");
        } catch {
            state = { partitionKey: "Control", rowKey: "Cooldown", cooldownUntil: 0, count: 0 };
        }

        const now = new Date().getTime();

        // Validación del Cooldown (1 hora)
        if (now < state.cooldownUntil) {
            const tiempoRestante = Math.ceil((state.cooldownUntil - now) / 60000);
            return {
                status: 429,
                body: `Sistema en enfriamiento. Intenta en ${tiempoRestante} minutos.`
            };
        }

        // Lógica: Si van 3 encendidos, activar cooldown de 1 hora (3600000 ms)
        state.count += 1;
        if (state.count >= 3) {
            state.cooldownUntil = now + (60 * 60 * 1000);
            state.count = 0; // Reiniciar contador
        }
        await tableClient.upsertEntity(state);

        // Iniciar el Orquestador
        const instanceId = await client.startNew('systemOrchestrator');
        return { status: 200, body: "Sistema iniciando por 3 minutos." };
    }
});
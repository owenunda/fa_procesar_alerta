const { app } = require('@azure/functions');
const df = require('durable-functions');
const { TableClient } = require("@azure/data-tables");

app.http('startSystem', {
    route: 'start',
    extraInputs: [df.input.durableClient()],
    handler: async (request, context) => {
        try {
            const client = df.getClient(context);

            // Conexión a Table Storage
            const tableClient = TableClient.fromConnectionString(process.env.AzureWebJobsStorage, "SystemState");
            
            // IMPORTANTE: Asegurar que la tabla exista antes de operar
            await tableClient.createTable();

            let state;
            try {
                // Intentar leer el estado actual
                state = await tableClient.getEntity("Control", "Cooldown");
            } catch (error) {
                // Si la entidad no existe (ej. primera ejecución), la creamos
                if (error.statusCode === 404) {
                     state = { partitionKey: "Control", rowKey: "Cooldown", cooldownUntil: 0, count: 0 };
                } else {
                     throw error;
                }
            }

            const now = new Date().getTime();

            // Validación del Cooldown (1 hora)
            if (now < state.cooldownUntil) {
                const tiempoRestante = Math.ceil((state.cooldownUntil - now) / 60000);
                return {
                    status: 429,
                    body: JSON.stringify({ message: `Sistema en enfriamiento. Intenta en ${tiempoRestante} minutos.` }),
                    headers: { 'Content-Type': 'application/json' }
                };
            }

            // Lógica: Si van 3 encendidos, activar cooldown de 1 hora (3600000 ms)
            state.count += 1;
            if (state.count >= 3) {
                state.cooldownUntil = now + (60 * 60 * 1000);
                state.count = 0; // Reiniciar contador
            }
            
            // Guardar el estado actualizado
            await tableClient.upsertEntity(state);

            // Iniciar el Orquestador
            const instanceId = await client.startNew('systemOrchestrator');
            
            context.log(`Orquestador iniciado con ID: ${instanceId}`);

            return { 
                status: 200, 
                body: JSON.stringify({ message: "Sistema iniciando por 3 minutos." }),
                headers: { 'Content-Type': 'application/json' }
            };
            
        } catch (error) {
            context.log.error("Error al iniciar el sistema:", error);
            return {
                status: 500,
                body: JSON.stringify({ error: "Error interno del servidor", details: error.message }),
                headers: { 'Content-Type': 'application/json' }
            };
        }
    }
});
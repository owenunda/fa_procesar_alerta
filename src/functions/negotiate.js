const { app, input } = require('@azure/functions');

// Esta función es obligatoria para que el Dashboard pueda conectarse
app.http('negotiate', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'negotiate',
    extraInputs: [
        input.generic({
            type: 'signalRConnectionInfo',
            name: 'connectionInfo',
            hubName: 'trafficHub', // Debe ser el mismo nombre que usaste en ProcesarAlerta.js
            connectionStringSetting: 'AzureSignalRConnectionString'
        })
    ],
    handler: async (request, context) => {
        return { body: JSON.stringify(context.extraInputs.get('connectionInfo')) };
    }
});
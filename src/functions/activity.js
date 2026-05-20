const { app } = require('@azure/functions');
const df = require('durable-functions');
const { StreamAnalyticsManagementClient } = require("@azure/arm-streamanalytics");
const { DefaultAzureCredential } = require("@azure/identity");

const subscriptionId = "c08f4fd9-ff22-4b3e-b089-a7de25cb28ec";
const resourceGroupName = "RG-Traffic-CloudNative";
const jobName = "job-traffic-analysis";

df.app.activity('toggleSystem', {
    handler: async (action, context) => {
        // Usa las credenciales locales (az login) o la identidad de la Function App en la nube
        const credential = new DefaultAzureCredential();
        const client = new StreamAnalyticsManagementClient(credential, subscriptionId);

        if (action === 'START') {
            context.log("Enviando orden de START a Stream Analytics...");
            await client.streamingJobs.beginStart(resourceGroupName, jobName);
            context.log("Stream Analytics Iniciado exitosamente.");
        } else if (action === 'STOP') {
            context.log("Enviando orden de STOP a Stream Analytics...");
            await client.streamingJobs.beginStop(resourceGroupName, jobName);
            context.log("Stream Analytics Detenido exitosamente.");
        }
    }
});
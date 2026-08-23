import { format, transports } from 'winston';
import { WinstonModuleOptions, utilities as nestWinstonModuleUtilities } from 'nest-winston';

export const winstonConfig: WinstonModuleOptions = {
    transports: [
        // Consola para desarrollo
        new transports.Console({
            format: format.combine(
                format.timestamp(),
                format.ms(),
                // Aquí usamos las utilities de nest-winston
                nestWinstonModuleUtilities.format.nestLike('DeliveryAPI', {
                    colors: true,
                    appName: true,
                }),
            ),
        }),
        // En el futuro, aquí se pueden añadir transports para guardar logs en archivos o enviarlos a un servicio como Datadog/AWS CloudWatch.
    ],
};

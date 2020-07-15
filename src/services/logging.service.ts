import { LoggingService } from '@bde-polytech-mtp/base-backend';

export class StdLoggingService implements LoggingService {

    info(message: string, data: any): void {
        console.info(message, data);
    }

    warning(message: string, data: any): void {
        console.warn(message, data);
    }

    error(message: string, data: any): void {
        console.error(message, data);
    }

}
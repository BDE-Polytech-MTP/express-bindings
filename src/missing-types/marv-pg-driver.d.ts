declare module 'marv-pg-driver' {

    import { MarvDriver } from 'marv/api/promise';
    
    export default function driver(options: { connection: object }): MarvDriver;

}
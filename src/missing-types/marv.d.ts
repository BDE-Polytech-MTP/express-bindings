declare module 'marv/api/promise' {

    type MarvMigrations = any;
    export type MarvDriver = { driver: ({ connection: object}) }; 
    function scan(directory: string): Promise<MarvMigrations>;
    function migrate(migrations: MarvMigrations, driver: MarvDriver): Promise<void>;

}
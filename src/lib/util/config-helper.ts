import dotenv from 'dotenv';
import { load, type Config } from 'cloud-config-client';


let config: Config;

const loadConfig = async () => {
    dotenv.config();
    config = await load({
        name: process.env.CONFIG_SERVER_APPLICATION || '',
        profiles: process.env.ACTIVE_PROFILE,
        auth: {
            user: process.env.CONFIG_SERVER_USER || '',
            pass: process.env.CONFIG_SERVER_PASSWORD || '',
        },
        endpoint: process.env.CONFIG_SERVER_URL,
    });
};

export {loadConfig, config}

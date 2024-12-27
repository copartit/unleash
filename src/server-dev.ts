import { start } from './lib/server-impl';
import { createConfig } from './lib/create-config';
import { LogLevel } from './lib/logger';
import { ApiTokenType } from './lib/types/models/api-token';
import { loadConfig, config } from './lib/util/config-helper';


process.nextTick(async () => {
    try {
        await loadConfig();
        await start(
            createConfig({
                enterpriseVersion: 'pro',
                db: {
                    user: config.get('pg.datasource.username'),
                    password: config.get('pg.datasource.password'),
                    host: config.get('pg.datasource.host'),
                    port: config.get('pg.datasource.port'),
                    database: config.get('pg.datasource.db'),
                    schema: config.get('pg.datasource.schema'),
                    ssl: false,
                    applicationName: 'unleash-sharedservices',
                },
                server: {
                    enableRequestLogger: true,
                    baseUriPath: '',
                    // keepAliveTimeout: 1,
                    gracefulShutdownEnable: true,
                    // cdnPrefix: 'https://cdn.getunleash.io/unleash/v4.4.1',
                    enableHeapSnapshotEnpoint: true,
                },
                logLevel: LogLevel.debug,
                secureHeaders: false,
                versionCheck: {
                    enable: false,
                },
                experimental: {
                    // externalResolver: unleash,
                    flags: {
                        embedProxy: true,
                        embedProxyFrontend: true,
                        anonymiseEventLog: false,
                        responseTimeWithAppNameKillSwitch: false,
                        celebrateUnleash: true,
                        userAccessUIEnabled: true,
                        outdatedSdksBanner: true,
                        disableShowContextFieldSelectionValues: false,
                        feedbackPosting: true,
                        manyStrategiesPagination: true,
                        enableLegacyVariants: false,
                        extendedMetrics: true,
                        originMiddlewareRequestLogging: true,
                        webhookDomainLogging: true,
                        releasePlans: false,
                        simplifyProjectOverview: true,
                        showUserDeviceCount: true,
                        flagOverviewRedesign: false,
                        licensedUsers: true,
                        granularAdminPermissions: true,
                        deltaApi: true,
                    },
                },
                authentication: {
                    initApiTokens: [
                        {
                            environment: '*',
                            project: '*',
                            secret: '*:*.964a287e1b728cb5f4f3e0120df92cb5',
                            type: ApiTokenType.ADMIN,
                            tokenName: 'some-user',
                        },
                    ],
                },
                /* can be tweaked to control configuration caching for /api/client/features
                clientFeatureCaching: {
                    enabled: true,
                    maxAge: 4000,
                },
                */
            }),
        );
    } catch (error) {
        if (error.code === 'EADDRINUSE') {
            // eslint-disable-next-line no-console
            console.warn('Port in use. You might want to reload once more.');
        } else {
            // eslint-disable-next-line no-console
            console.error(error);
            process.exit();
        }
    }
}, 0);

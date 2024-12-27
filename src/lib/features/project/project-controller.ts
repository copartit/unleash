import type { Response } from 'express';
import type { Db } from '../../db/db';
import { createKnexTransactionStarter } from '../../db/transaction';
import {
    createResponseSchema,
    type DeprecatedProjectOverviewSchema,
    deprecatedProjectOverviewSchema,
    outdatedSdksSchema,
    type OutdatedSdksSchema,
    type ProjectDoraMetricsSchema,
    projectDoraMetricsSchema,
    projectOverviewSchema,
    type ProjectSchema,
    type ProjectsSchema,
    projectsSchema
} from '../../openapi';
import { projectApplicationsQueryParameters } from '../../openapi/spec/project-applications-query-parameters';
import {
    projectApplicationsSchema,
    type ProjectApplicationsSchema,
} from '../../openapi/spec/project-applications-schema';
import {
    projectFlagCreatorsSchema,
    type ProjectFlagCreatorsSchema,
} from '../../openapi/spec/project-flag-creators-schema';
import type { ProjectOverviewSchema } from '../../openapi/spec/project-overview-schema';
import { getStandardResponses } from '../../openapi/util/standard-responses';
import { ProjectApiTokenController } from '../../routes/admin-api/project/api-token';
import ProjectHealthReport from '../../routes/admin-api/project/health-report';
import ProjectArchiveController from '../../routes/admin-api/project/project-archive';
import VariantsController from '../../routes/admin-api/project/variants';
import Controller from '../../routes/controller';
import type { IAuthRequest } from '../../routes/unleash-types';
import type { OpenApiService } from '../../services';
import {
    CREATE_PROJECT,
    type IArchivedQuery,
    type IFlagResolver,
    type IProjectParam,
    type IProjectUpdate,
    type IUnleashConfig,
    type IUnleashServices,
    NONE,
    PROJECT_USER_ACCESS_WRITE,
    type ProjectCreated,
    serializeDates,
} from '../../types';
import DependentFeaturesController from '../dependent-features/dependent-features-controller';
import FeatureLifecycleController from '../feature-lifecycle/feature-lifecycle-controller';
import { normalizeQueryParams } from '../feature-search/search-utils';
import ProjectFeaturesController from '../feature-toggle/feature-toggle-controller';
import type ClientInstanceService from '../metrics/instance/instance-service';
import EnvironmentsController from '../project-environments/environments';
import ProjectInsightsController from '../project-insights/project-insights-controller';
import ProjectStatusController from '../project-status/project-status-controller';
import type ProjectService from './project-service';
import type { AccessWithRoles } from '../../services/access-service';

export default class ProjectController extends Controller {
    private projectService: ProjectService;

    private openApiService: OpenApiService;

    private clientInstanceService: ClientInstanceService;

    private flagResolver: IFlagResolver;

    constructor(config: IUnleashConfig, services: IUnleashServices, db: Db) {
        super(config);
        this.projectService = services.projectService;
        this.clientInstanceService = services.clientInstanceService;
        this.openApiService = services.openApiService;
        this.flagResolver = config.flagResolver;

        this.route({
            path: '',
            method: 'get',
            handler: this.getProjects,
            permission: NONE,
            middleware: [
                this.openApiService.validPath({
                    tags: ['Projects'],
                    operationId: 'getProjects',
                    summary: 'Get a list of all projects.',
                    description:
                        'This endpoint returns an list of all the projects in the Unleash instance.',
                    parameters: [
                        {
                            name: 'archived',
                            in: 'query',
                            required: false,
                            schema: {
                                type: 'boolean',
                            },
                        },
                    ],
                    responses: {
                        200: createResponseSchema('projectsSchema'),
                        ...getStandardResponses(401, 403),
                    },
                }),
            ],
        });

        this.route({
            path: '',
            method: 'post',
            handler: this.createProject,
            permission: CREATE_PROJECT,
        });

        this.route({
            path: '/:projectId',
            method: 'put',
            handler: this.updateProject,
            permission: CREATE_PROJECT,
        });

        this.route({
            path: '/archive/:projectId',
            method: 'post',
            handler: this.archiveProject,
            permission: CREATE_PROJECT,
        });

        this.route({
            path: '/revive/:projectId',
            method: 'post',
            handler: this.reviveProject,
            permission: CREATE_PROJECT,
        });

        this.route({
            method: 'get',
            path: '/:projectId',
            handler: this.getDeprecatedProjectOverview,
            permission: NONE,
            middleware: [
                this.openApiService.validPath({
                    tags: ['Projects'],
                    operationId: 'getDeprecatedProjectOverview',
                    summary: 'Get an overview of a project. (deprecated)',
                    deprecated: true,
                    description:
                        'This endpoint returns an overview of the specified projects stats, project health, number of members, which environments are configured, and the features in the project.',
                    responses: {
                        200: createResponseSchema(
                            'deprecatedProjectOverviewSchema',
                        ),
                        ...getStandardResponses(401, 403, 404),
                    },
                }),
            ],
        });

        this.route({
            method: 'get',
            path: '/:projectId/overview',
            handler: this.getProjectOverview,
            permission: NONE,
            middleware: [
                this.openApiService.validPath({
                    tags: ['Projects'],
                    operationId: 'getProjectOverview',
                    summary: 'Get an overview of a project.',
                    description:
                        'This endpoint returns an overview of the specified projects stats, project health, number of members, which environments are configured, and the features types in the project.',
                    responses: {
                        200: createResponseSchema('projectOverviewSchema'),
                        ...getStandardResponses(401, 403, 404),
                    },
                }),
            ],
        });

        this.route({
            method: 'get',
            path: '/:projectId/access',
            handler: this.getAccess,
            permission: NONE,
        });

        this.route({
            method: 'post',
            path: '/:projectId/access',
            handler: this.addAccess,
            permission: PROJECT_USER_ACCESS_WRITE,
        });

        this.route({
            method: 'put',
            path: '/:projectId/users/:userId/roles',
            handler: this.updateRoles,
            permission: PROJECT_USER_ACCESS_WRITE,
        });

        this.route({
            method: 'delete',
            path: '/:projectId/users/:userId/roles',
            handler: this.deleteRoles,
            permission: PROJECT_USER_ACCESS_WRITE,
        });

        /** @deprecated use project insights instead */
        this.route({
            method: 'get',
            path: '/:projectId/dora',
            handler: this.getProjectDora,
            permission: NONE,
            middleware: [
                this.openApiService.validPath({
                    tags: ['Projects'],
                    operationId: 'getProjectDora',
                    summary: 'Get an overview project dora metrics.',
                    description:
                        'This endpoint returns an overview of the specified dora metrics',
                    responses: {
                        200: createResponseSchema('projectDoraMetricsSchema'),
                        ...getStandardResponses(401, 403, 404),
                    },
                }),
            ],
        });

        this.route({
            method: 'get',
            path: '/:projectId/applications',
            handler: this.getProjectApplications,
            permission: NONE,
            middleware: [
                this.openApiService.validPath({
                    tags: ['Projects'],
                    operationId: 'getProjectApplications',
                    summary: 'Get a list of all applications for a project.',
                    description:
                        'This endpoint returns an list of all the applications for a project.',
                    parameters: [...projectApplicationsQueryParameters],
                    responses: {
                        200: createResponseSchema('projectApplicationsSchema'),
                        ...getStandardResponses(401, 403, 404),
                    },
                }),
            ],
        });

        this.route({
            method: 'get',
            path: '/:projectId/flag-creators',
            handler: this.getProjectFlagCreators,
            permission: NONE,
            middleware: [
                this.openApiService.validPath({
                    tags: ['Projects'],
                    operationId: 'getProjectFlagCreators',
                    summary: 'Get a list of all flag creators for a project.',
                    description:
                        'This endpoint returns every user who created a flag in the project.',
                    responses: {
                        200: createResponseSchema('projectFlagCreatorsSchema'),
                        ...getStandardResponses(401, 403, 404),
                    },
                }),
            ],
        });

        this.route({
            method: 'get',
            path: '/:projectId/sdks/outdated',
            handler: this.getOutdatedProjectSdks,
            permission: NONE,
            middleware: [
                this.openApiService.validPath({
                    tags: ['Projects'],
                    operationId: 'getOutdatedProjectSdks',
                    summary: 'Get outdated project SDKs',
                    description:
                        'Returns a list of the outdated SDKS with the applications using them.',
                    responses: {
                        200: createResponseSchema('outdatedSdksSchema'),
                        ...getStandardResponses(404),
                    },
                }),
            ],
        });

        this.use(
            '/',
            new ProjectFeaturesController(
                config,
                services,
                createKnexTransactionStarter(db),
            ).router,
        );
        this.use('/', new DependentFeaturesController(config, services).router);
        this.use('/', new EnvironmentsController(config, services).router);
        this.use('/', new ProjectHealthReport(config, services).router);
        this.use('/', new VariantsController(config, services).router);
        this.use('/', new ProjectApiTokenController(config, services).router);
        this.use(
            '/',
            new ProjectArchiveController(
                config,
                services,
                createKnexTransactionStarter(db),
            ).router,
        );
        this.use('/', new ProjectInsightsController(config, services).router);
        this.use('/', new ProjectStatusController(config, services).router);
        this.use('/', new FeatureLifecycleController(config, services).router);
    }

    async getProjects(
        req: IAuthRequest,
        res: Response<ProjectsSchema>,
    ): Promise<void> {
        const { user } = req;
        const { archived } = req.query
        const projects = await this.projectService.getProjects(
            {
                id: undefined,
                archived,
            },
            user.id,
        );

        const projectsWithOwners =
            await this.projectService.addOwnersToProjects(projects);

        this.openApiService.respondWithValidation(
            200,
            res,
            projectsSchema.$id,
            { version: 1, projects: serializeDates(projectsWithOwners) },
        );
    }

    async getAccess(
        req: IAuthRequest<IProjectParam, any, any, any>,
        res: Response<AccessWithRoles>
    ): Promise<void> {
        const { projectId } = req.params
        const data = await this.projectService.getAccessToProject(projectId);
        res.status(200).json(data)
    }

    async addAccess(
        req: IAuthRequest<IProjectParam, any, any, any>,
        res: Response<void>
    ): Promise<void> {
        const { projectId } = req.params
        const body = req.body;
        await this.projectService.addAccess(projectId, body.roles, body.groups, body.users, req.audit);
        res.status(204).json();
    }

    async updateRoles(
        req: IAuthRequest<{projectId: string, userId: number}, any, any, any>,
        res: Response<void>
    ): Promise<void> {
        const { projectId, userId } = req.params
        const body = req.body;
        await this.projectService.setRolesForUser(projectId, userId,  body.roles, req.audit);
        res.status(204).json();
    }

    async deleteRoles(
        req: IAuthRequest<{projectId: string, userId: number}, any, any, any>,
        res: Response<void>
    ): Promise<void> {
        const { projectId, userId } = req.params
        await this.projectService.removeUserAccess(projectId, userId, req.audit);
        res.status(204).json();
    }

    async createProject(
        req: IAuthRequest<undefined, any, any, any>,
        res: Response<ProjectSchema>,
    ): Promise<void> {
        const data: ProjectCreated = await this.projectService.createProject(
            req.body,
            req.user,
            req.audit,
        );
        res.status(201).json(data)
    }

    async updateProject(
        req: IAuthRequest<any, any, IProjectUpdate, any>,
        res: Response<void>,
    ): Promise<void> {
        await this.projectService.updateProject(
            req.body,
            req.audit,
        );
        res.status(204).json()
    }

    async archiveProject(
        req: IAuthRequest<IProjectParam, any, any, any>,
        res: Response<void>,
    ): Promise<void> {
        const { projectId } = req.params; 
        await this.projectService.archiveProject(
            projectId,
            req.audit,
        );
        res.status(204).json()
    }

    async reviveProject(
        req: IAuthRequest<IProjectParam, any, any, any>,
        res: Response<void>,
    ): Promise<void> {
        const { projectId } = req.params; 
        await this.projectService.reviveProject(
            projectId,
            req.audit,
        );
        res.status(204).json()
    }

    async getDeprecatedProjectOverview(
        req: IAuthRequest<IProjectParam, unknown, unknown, IArchivedQuery>,
        res: Response<DeprecatedProjectOverviewSchema>,
    ): Promise<void> {
        const { projectId } = req.params;
        const { archived } = req.query;
        const { user } = req;
        const overview = await this.projectService.getProjectHealth(
            projectId,
            archived,
            user.id,
        );

        this.openApiService.respondWithValidation(
            200,
            res,
            deprecatedProjectOverviewSchema.$id,
            serializeDates(overview),
        );
    }

    async getProjectOverview(
        req: IAuthRequest<IProjectParam, unknown, unknown, IArchivedQuery>,
        res: Response<ProjectOverviewSchema>,
    ): Promise<void> {
        const { projectId } = req.params;
        const { archived } = req.query;
        const { user } = req;
        const overview = await this.projectService.getProjectOverview(
            projectId,
            archived,
            user.id,
        );

        this.openApiService.respondWithValidation(
            200,
            res,
            projectOverviewSchema.$id,
            serializeDates(overview),
        );
    }

    /** @deprecated use projectInsights instead */
    async getProjectDora(
        req: IAuthRequest,
        res: Response<ProjectDoraMetricsSchema>,
    ): Promise<void> {
        const { projectId } = req.params;

        const dora = await this.projectService.getDoraMetrics(projectId);

        this.openApiService.respondWithValidation(
            200,
            res,
            projectDoraMetricsSchema.$id,
            dora,
        );
    }

    async getProjectApplications(
        req: IAuthRequest,
        res: Response<ProjectApplicationsSchema>,
    ): Promise<void> {
        const { projectId } = req.params;

        const {
            normalizedQuery,
            normalizedSortOrder,
            normalizedOffset,
            normalizedLimit,
        } = normalizeQueryParams(req.query, {
            limitDefault: 50,
            maxLimit: 100,
        });

        const applications = await this.projectService.getApplications({
            searchParams: normalizedQuery,
            project: projectId,
            offset: normalizedOffset,
            limit: normalizedLimit,
            sortBy: req.query.sortBy,
            sortOrder: normalizedSortOrder,
        });

        this.openApiService.respondWithValidation(
            200,
            res,
            projectApplicationsSchema.$id,
            serializeDates(applications),
        );
    }

    async getProjectFlagCreators(
        req: IAuthRequest<IProjectParam>,
        res: Response<ProjectFlagCreatorsSchema>,
    ): Promise<void> {
        const { projectId } = req.params;

        const flagCreators =
            await this.projectService.getProjectFlagCreators(projectId);

        this.openApiService.respondWithValidation(
            200,
            res,
            projectFlagCreatorsSchema.$id,
            serializeDates(flagCreators),
        );
    }

    async getOutdatedProjectSdks(
        req: IAuthRequest<IProjectParam>,
        res: Response<OutdatedSdksSchema>,
    ) {
        const { projectId } = req.params;
        const outdatedSdks =
            await this.clientInstanceService.getOutdatedSdksByProject(
                projectId,
            );

        this.openApiService.respondWithValidation(
            200,
            res,
            outdatedSdksSchema.$id,
            { sdks: outdatedSdks },
        );
    }
}

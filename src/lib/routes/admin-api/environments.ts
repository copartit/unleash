import type { Request, Response } from 'express';
import Controller from '../controller';
import type { IUnleashServices } from '../../types/services';
import type { IUnleashConfig } from '../../types/option';
import type EnvironmentService from '../../features/project-environments/environment-service';
import type { Logger } from '../../logger';
import { ADMIN, NONE } from '../../types/permissions';
import type { OpenApiService } from '../../services/openapi-service';
import { createRequestSchema } from '../../openapi/util/create-request-schema';
import { createResponseSchema } from '../../openapi/util/create-response-schema';
import {
    environmentsSchema,
    type EnvironmentsSchema,
} from '../../openapi/spec/environments-schema';
import {
    environmentSchema,
    type EnvironmentSchema,
} from '../../openapi/spec/environment-schema';
import type { SortOrderSchema } from '../../openapi/spec/sort-order-schema';
import {
    emptyResponse,
    getStandardResponses,
} from '../../openapi/util/standard-responses';
import {
    environmentsProjectSchema,
    type EnvironmentsProjectSchema,
} from '../../openapi/spec/environments-project-schema';
import { IEnvironment } from '../../internals';

interface EnvironmentParam {
    name: string;
}

interface ProjectParam {
    projectId: string;
}

export class EnvironmentsController extends Controller {
    private logger: Logger;

    private openApiService: OpenApiService;

    private service: EnvironmentService;

    constructor(
        config: IUnleashConfig,
        {
            environmentService,
            openApiService,
        }: Pick<IUnleashServices, 'environmentService' | 'openApiService'>,
    ) {
        super(config);
        this.logger = config.getLogger('admin-api/environments-controller.ts');
        this.openApiService = openApiService;
        this.service = environmentService;

        this.route({
            method: 'get',
            path: '',
            handler: this.getAllEnvironments,
            permission: NONE,
            middleware: [
                openApiService.validPath({
                    tags: ['Environments'],
                    summary: 'Get all environments',
                    description:
                        'Retrieves all environments that exist in this Unleash instance.',
                    operationId: 'getAllEnvironments',
                    responses: {
                        200: createResponseSchema('environmentsSchema'),
                        ...getStandardResponses(401, 403),
                    },
                }),
            ],
        });

        this.route({
            method: 'post',
            path: '',
            handler: this.createEnvironment,
            permission: ADMIN,
        });

        this.route({
            method: 'put',
            path: '/update/:name',
            handler: this.updateEnvironment,
            permission: ADMIN,
        });

        this.route({
            method: 'delete',
            path: '/:name',
            handler: this.deleteEnvironment,
            permission: ADMIN,
        });

        this.route({
            method: 'post',
            path: '/validate',
            handler: this.validateEnvironment,
            permission: ADMIN,
        });

        this.route({
            method: 'get',
            path: '/:name',
            handler: this.getEnvironment,
            permission: NONE,
            middleware: [
                openApiService.validPath({
                    tags: ['Environments'],
                    operationId: 'getEnvironment',
                    summary: 'Get the environment with `name`',
                    description:
                        'Retrieves the environment with `name` if it exists in this Unleash instance',
                    responses: {
                        200: createResponseSchema('environmentSchema'),
                        ...getStandardResponses(401, 403, 404),
                    },
                }),
            ],
        });

        this.route({
            method: 'get',
            path: '/project/:projectId',
            handler: this.getProjectEnvironments,
            permission: NONE,
            middleware: [
                openApiService.validPath({
                    tags: ['Environments'],
                    operationId: 'getProjectEnvironments',
                    summary: 'Get the environments available to a project',
                    description:
                        'Gets the environments that are available for this project. An environment is available for a project if enabled in the [project configuration](https://docs.getunleash.io/reference/environments#enable-an-environment)',
                    responses: {
                        200: createResponseSchema('environmentsProjectSchema'),
                        ...getStandardResponses(401, 403, 404),
                    },
                }),
            ],
        });

        this.route({
            method: 'put',
            path: '/sort-order',
            handler: this.updateSortOrder,
            permission: ADMIN,
            middleware: [
                openApiService.validPath({
                    tags: ['Environments'],
                    summary: 'Update environment sort orders',
                    description:
                        'Updates sort orders for the named environments. Environments not specified are unaffected.',
                    operationId: 'updateSortOrder',
                    requestBody: createRequestSchema('sortOrderSchema'),
                    responses: {
                        200: emptyResponse,
                        ...getStandardResponses(401, 403, 404),
                    },
                }),
            ],
        });

        this.route({
            method: 'post',
            path: '/:name/on',
            acceptAnyContentType: true,
            handler: this.toggleEnvironmentOn,
            permission: ADMIN,
            middleware: [
                openApiService.validPath({
                    tags: ['Environments'],
                    summary: 'Toggle the environment with `name` on',
                    description:
                        'Makes it possible to enable this environment for a project. An environment must first be globally enabled using this endpoint before it can be enabled for a project',
                    operationId: 'toggleEnvironmentOn',
                    responses: {
                        204: emptyResponse,
                        ...getStandardResponses(401, 403, 404),
                    },
                }),
            ],
        });

        this.route({
            method: 'post',
            path: '/:name/off',
            acceptAnyContentType: true,
            handler: this.toggleEnvironmentOff,
            permission: ADMIN,
            middleware: [
                openApiService.validPath({
                    tags: ['Environments'],
                    summary: 'Toggle the environment with `name` off',
                    description:
                        'Removes this environment from the list of available environments for projects to use',
                    operationId: 'toggleEnvironmentOff',
                    responses: {
                        204: emptyResponse,
                        ...getStandardResponses(401, 403, 404),
                    },
                }),
            ],
        });
    }

    async createEnvironment(
        req: Request,
        res: Response<IEnvironment>,
    ): Promise<void> {
        const createRes = await this.service.createEnvironments(req.body);
        res.status(201).json(createRes);
    }

    async updateEnvironment(
        req: Request<EnvironmentParam>,
        res: Response<void>,
    ): Promise<void> {
        const { name } = req.params;
        await this.service.updateEnvironment(req.body, name);
        res.status(200).json();
    }

    async deleteEnvironment(
        req: Request<EnvironmentParam>,
        res: Response<void>,
    ): Promise<void> {
        const { name } = req.params;
        await this.service.deleteEnvironment(name);
        res.status(204).json();
    }

    async validateEnvironment(
        req: Request,
        res: Response<boolean>,
    ): Promise<void> {
        const nameExists = await this.service.validateEnvName(req.body);
        res.status(201).json(nameExists);
    }

    async getAllEnvironments(
        req: Request,
        res: Response<EnvironmentsSchema>,
    ): Promise<void> {
        this.openApiService.respondWithValidation(
            200,
            res,
            environmentsSchema.$id,
            { version: 1, environments: await this.service.getAll() },
        );
    }

    async updateSortOrder(
        req: Request<unknown, unknown, SortOrderSchema>,
        res: Response,
    ): Promise<void> {
        await this.service.updateSortOrder(req.body);
        res.status(200).end();
    }

    async toggleEnvironmentOn(
        req: Request<EnvironmentParam>,
        res: Response,
    ): Promise<void> {
        const { name } = req.params;
        await this.service.toggleEnvironment(name, true);
        res.status(204).end();
    }

    async toggleEnvironmentOff(
        req: Request<EnvironmentParam>,
        res: Response,
    ): Promise<void> {
        const { name } = req.params;
        await this.service.toggleEnvironment(name, false);
        res.status(204).end();
    }

    async getEnvironment(
        req: Request<EnvironmentParam>,
        res: Response<EnvironmentSchema>,
    ): Promise<void> {
        this.openApiService.respondWithValidation(
            200,
            res,
            environmentSchema.$id,
            await this.service.get(req.params.name),
        );
    }

    async getProjectEnvironments(
        req: Request<ProjectParam>,
        res: Response<EnvironmentsProjectSchema>,
    ): Promise<void> {
        this.openApiService.respondWithValidation(
            200,
            res,
            environmentsProjectSchema.$id,
            {
                version: 1,
                environments: (await this.service.getProjectEnvironments(
                    req.params.projectId,
                )) as any,
            },
        );
    }
}

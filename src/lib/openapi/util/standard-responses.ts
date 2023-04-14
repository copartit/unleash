export const emptyResponse = {
    description: 'This response has no body.',
} as const;

const unauthorizedResponse = {
    description:
        'Authorization information is missing or invalid. Provide a valid API token as the `authorization` header, e.g. `authorization:*.*.my-admin-token`.',
} as const;

const forbiddenResponse = {
    description:
        'User credentials are valid but does not have enough privileges to execute this operation',
} as const;

const badRequestResponse = {
    description: 'The request data does not match what we expect.',
} as const;

const notFoundResponse = {
    description: 'The requested resource was not found.',
} as const;

const conflictResponse = {
    description:
        'The provided resource can not be created or updated because it would conflict with the current state of the resource or with an already existing resource, respectively.',
} as const;

const contentTooLargeResponse = {
    description:
        'The body request body is larger than what we accept. By default we only accept bodies of 100kB or less',
} as const;

const unsupportedMediaTypeResponse = {
    description: `The operation does not support request payloads of the provided type. Please ensure that you're using one of the listed payload types and that you have specified the right content type in the "content-type" header.`,
} as const;

const standardResponses = {
    400: badRequestResponse,
    401: unauthorizedResponse,
    403: forbiddenResponse,
    404: notFoundResponse,
    409: conflictResponse,
    413: contentTooLargeResponse,
    415: unsupportedMediaTypeResponse,
} as const;

type StandardResponses = typeof standardResponses;

export const getStandardResponses = (
    ...statusCodes: (keyof StandardResponses)[]
): Partial<StandardResponses> =>
    statusCodes.reduce(
        (acc, statusCode) => ({
            ...acc,
            [statusCode]: standardResponses[statusCode],
        }),
        {} as Partial<StandardResponses>,
    );

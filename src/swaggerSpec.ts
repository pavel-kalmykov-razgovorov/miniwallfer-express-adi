import SwaggerJSDoc = require("swagger-jsdoc")

const swaggerDefinition = {
    info: {
        version: "0.1.1",
        title: "Mini Wallfer",
        description: "Minimalistic implementation of the Wallfer platform for colleges",
        contact: {
            name: "Pavel Razgovorov",
            email: "pr18@alu.ua.es",
        },
        license: {
            name: "MIT",
            url: "http://github.com/gruntjs/grunt/blob/master/LICENSE-MIT",
        },
        schemes: ["http"],
        consumes: ["application/json"],
        produces: ["application/json", "application/hal+json"],
    },
    definitions: {
        User: {
            allOf: [
                {
                    $ref: "#/definitions/NewUser",
                },
                {
                    title: "User",
                    properties: {
                        id: { type: "integer" },
                    },
                    required: ["id"],
                },
            ],
        },
        NewUser: {
            type: "object",
            description: "A new (not registered) user wich doesn't have posts nor an ID",
            properties: {
                username: { type: "string" },
                password: { type: "string" },
                firstName: { type: "string" },
                lastName: { type: "string" },
                birthdate: { type: "string" },
            },
            required: ["username", "password", "firstName", "lastName", "birthdate"],
        },
        ApiError: {
            type: "object",
            properties: {
                message: { type: "string" },
            },
            required: ["message"],
        },
    },
    parameters: {
        startParam: {
            name: "start",
            in: "query",
            description: "First item to take in the pagination",
            required: true,
            type: "integer",
            default: 0,
        },
        sizeParam: {
            name: "size",
            in: "query",
            description: "Amount of items to take in the pagination",
            required: true,
            type: "integer",
            default: 10,
        },
    },
    responses: {
        ListNotPaginated: {
            description: "Due to performance reasons, the list must be paginated,\
                \ but you didn't provide the start & size query parameters",
            schema: { $ref: "#/definitions/ApiError" },
            examples: {
                "application/json": {
                    message: "Lists must be paginated with start=<num>&size=<num> query params (use 0 to list all)",
                },
            },
        },
        Ok: {
            description: "The expected, normal response when everything is correct",
        },
    },
    securityDefinitions: {
        jwt: {
            type: "apiKey",
            name: "Authorization",
            in: "header",
            description: "Must follow the format \"`Bearer [jwt-token]`\"",
        },
    },
}

const options = {
    swaggerDefinition,
    apis: [`${__dirname}/controller/*.ts`],
}

const swaggerJSON = SwaggerJSDoc(options)
module.exports = swaggerJSON

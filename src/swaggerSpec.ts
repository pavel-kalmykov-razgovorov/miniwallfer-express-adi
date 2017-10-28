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
                    description: "An existent user (persisted in the DB with an ID)",
                    properties: {
                        id: { type: "integer" },
                        posts: { type: "object" },
                    },
                    required: ["id"],
                    example: {
                        password: "~won't be sent~",
                        id: 1,
                        posts: [],
                      },
                },
            ],
        },
        NewUser: {
            allOf: [
                {
                    $ref: "#/definitions/Login",
                },
                {
                    title: "New User",
                    description: "A new (not registered) user wich doesn't have posts nor an ID",
                    properties: {
                        firstName: { type: "string" },
                        lastName: { type: "string" },
                        birthdate: { type: "string" },
                    },
                    required: ["firstName", "lastName", "birthdate"],
                    example: {
                        firstName: "Pavel",
                        lastName: "Razgovorov",
                        birthdate: "1996-11-27",
                      },
                },
            ],
        },
        Login: {
            title: "Login Credentials",
            description: "The required credentials in order to login to the API",
            properties: {
                username: { type: "string" },
                password: { type: "string", format: "password" },
            },
            required: ["username", "password"],
            example: {
                username: "paveltrufi",
                password: "mysecret123",
            },
            type: "object",
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
        id: {
            name: "id",
            in: "path",
            description: "The ID that identifies uniquely the entity",
            required: true,
            type: "integer",
        },
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
        login: {
            name: "Login credentials",
            in: "body",
            description: "The login's required values",
            required: true,
            schema: { $ref: "#/definitions/Login" },
        },
        newUser: {
            name: "New User",
            in: "body",
            description: "The registration's required values",
            required: true,
            schema: { $ref: "#/definitions/NewUser" },
        },
    },
    responses: {
        Ok: {
            description: "The expected, normal response when everything is correct",
        },
        Created: {
            description: "The instance was successfully persisted in the DB.\
                \ You'll be able to find it in the \"Location\" header",
        },
        EmptyResponse: {
            description: "Empty response because there's nothing to return",
        },
        ListNotPaginated: {
            description: "Due to performance reasons, the list must be paginated,\
                \ but you didn't provide the start & size query parameters",
            schema: { $ref: "#/definitions/ApiError" },
        },
        Unauthorized: {
            description: "The endpoint is secured and there's an error with the JWT Token's authentication",
            schema: { $ref: "#/definitions/ApiError" },
        },
        EntityNotFound: {
            description: "The entity you were looking for doesn't exist or is no longer available",
            schema: { $ref: "#/definitions/ApiError" },
        },
        UnprocessableEntity: {
            description: "There are errors in the request. Please read the response in order to understand the error",
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
    security: {
        jwt: [],
    },
    tags: {
        Users: {
            name: "Users",
            description: "User's resource operations",
        },
        Authentication: {
            name: "Authentication",
            description: "Login, register and other security operations",
        },
    },
}

const options = {
    swaggerDefinition,
    apis: [`${__dirname}/controller/*.ts`],
}

const swaggerJSON = SwaggerJSDoc(options)
module.exports = swaggerJSON

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
        produces: ["application/hal+json"],
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
    securityDefinitions: {
        jwt : {
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

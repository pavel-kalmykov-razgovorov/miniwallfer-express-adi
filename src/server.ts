import * as bodyParser from "body-parser"
import * as debug from "debug"
import * as express from "express"
import { NextFunction, Request, Response } from "express"
import * as http from "http"
import * as HttpStatus from "http-status-codes"
import * as logger from "morgan"
import "reflect-metadata"
import * as swaggerUi from "swagger-ui-express"
import { UserController } from "./controller/UserController"
import { Routes } from "./routes"
import * as swaggerSpec from "./swaggerSpec"

let app = null
export function createServer() {
    if (app) return app
    // create express app
    debug("ts-express:server")
    const port = normalizePort(process.env.PORT || 3000)
    app = express()
    const server = http.createServer(app)
    configureExpress()
    // register express routes from defined application routes
    Routes.forEach((route) => {
        (app as any)[route.method](route.route, isAutheticated, (req: Request, res: Response, next: NextFunction) => {
            const result = (new route.controller() as any)[route.action](req, res, next)
            if (result instanceof Promise) {
                result
                    .then((r) => r !== null && r !== undefined ? res.send(r) : undefined)
                    .catch((err) => sendHttpError(req, res, next, err))
            } else if (result !== null && result !== undefined) res.json(result)
        })
    })
    function sendHttpError(req: Request, res: Response, next: NextFunction, err) {
        return res.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).send({ message: err.message || err })
    }
    async function isAutheticated(req: Request, res: Response, next: NextFunction) {
        if ((req.originalUrl === "/login" || req.originalUrl === "/users") && req.method === "POST") next()
        else {
            new UserController().getCurrentUser(req, res, next)
                .then((user) => next())
                .catch((err) => sendHttpError(req, res, next, err))
        }
    }
    function configureExpress(): void {
        app.set("port", port)
        if (process.env.NODE_ENV !== "test") app.use(logger("dev"))
        app.use(bodyParser.json())
        app.use(bodyParser.urlencoded({ extended: false }))
        server.listen(port)
        server.on("error", onError)
        server.on("listening", onListening)
        app.get("/swagger.json", (req: Request, res: Response, next: NextFunction) => {
            res.type("application/json")
            res.send(swaggerSpec)
        })
        app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, true))
        app.get("/", (req: Request, res: Response, next: NextFunction) => res.redirect("api-docs"))
    }
    function normalizePort(val: number | string): number | string | boolean {
        const portNumber: number = (typeof val === "string") ? parseInt(val, 10) : val
        if (isNaN(portNumber)) return val
        else if (portNumber >= 0) return portNumber
        else return false
    }
    function onError(error: NodeJS.ErrnoException): void {
        if (error.syscall !== "listen") throw error
        const bind = (typeof port === "string") ? "Pipe " + port : "Port " + port
        switch (error.code) {
            case "EACCES":
                console.error(`${bind} requires elevated privileges`)
                process.exit(1)
                break
            case "EADDRINUSE":
                console.error(`${bind} is already in use`)
                process.exit(1)
                break
            default:
                throw error
        }
    }
    function onListening(): void {
        const addr = server.address()
        const bind = (typeof addr === "string") ? `pipe ${addr}` : `port ${addr.port}`
        debug(`Listening on ${bind}`)
    }
    console.log(`Express started on port ${port}`)
    return app
}

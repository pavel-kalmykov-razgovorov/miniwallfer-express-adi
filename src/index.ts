import * as bodyParser from "body-parser"
import * as debug from "debug"
import * as express from "express"
import { NextFunction, Request, Response } from "express"
import * as http from "http"
import * as logger from "morgan"
import "reflect-metadata"
import { createConnection } from "typeorm"
import { User } from "./entity/User"
import { Routes } from "./routes"

createConnection().then(async (connection) => {
    // create express app
    debug("ts-express:server")
    const port = normalizePort(process.env.PORT || 3000)
    const app = express()
    const server = http.createServer(app)
    configureExpress()

    // register express routes from defined application routes
    Routes.forEach((route) => {
        (app as any)[route.method](route.route, (req: Request, res: Response, next: NextFunction) => {
            const result = (new route.controller() as any)[route.action](req, res, next)
            if (result instanceof Promise)
                result
                    .then((r) => r !== null && r !== undefined ? res.send(r) : undefined)
                    .catch((err) => res.status(err.status || 500).send({ message: err.message || err }))
            else if (result !== null && result !== undefined) res.json(result)
        })
    })

    function configureExpress(): void {
        app.set("port", port)
        app.use(logger("dev"))
        app.use(bodyParser.json())
        app.use(bodyParser.urlencoded({ extended: false }))
        server.listen(port)
        server.on("error", onError)
        server.on("listening", onListening)
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
}).catch((error) => console.log(error))

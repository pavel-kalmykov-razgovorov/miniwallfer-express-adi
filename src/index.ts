import * as bodyParser from "body-parser"
import * as express from "express"
import { NextFunction, Request, Response } from "express"
import "reflect-metadata"
import { createConnection } from "typeorm"
import { User } from "./entity/User"
import { Routes } from "./routes"

createConnection().then(async (connection) => {

    // create express app
    const app = express()
    app.use(bodyParser.json())

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

    // setup express app here

    // start express server
    app.listen(3000)

    console.log("Express started on http://localhost:3000")
}).catch((error) => console.log(error))

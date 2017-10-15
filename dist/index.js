"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const bodyParser = require("body-parser");
const debug = require("debug");
const express = require("express");
const http = require("http");
const HttpStatus = require("http-status-codes");
const logger = require("morgan");
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const UserController_1 = require("./controller/UserController");
const routes_1 = require("./routes");
typeorm_1.createConnection().then((connection) => __awaiter(this, void 0, void 0, function* () {
    // create express app
    debug("ts-express:server");
    const port = normalizePort(process.env.PORT || 3000);
    const app = express();
    const server = http.createServer(app);
    configureExpress();
    // register express routes from defined application routes
    routes_1.Routes.forEach((route) => {
        app[route.method](route.route, isAutheticated, (req, res, next) => {
            const result = new route.controller()[route.action](req, res, next);
            if (result instanceof Promise) {
                result
                    .then((r) => r !== null && r !== undefined ? res.send(r) : undefined)
                    .catch((err) => sendHttpError(req, res, next, err));
            }
            else if (result !== null && result !== undefined)
                res.json(result);
        });
    });
    function sendHttpError(req, res, next, err) {
        return res.status(err.status || HttpStatus.INTERNAL_SERVER_ERROR).send({ message: err.message || err });
    }
    function isAutheticated(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            if ((req.originalUrl === "/login" || req.originalUrl === "/register") && req.method === "POST")
                next();
            else {
                new UserController_1.UserController().getCurrentUser(req, res, next)
                    .then((user) => next())
                    .catch((err) => sendHttpError(req, res, next, err));
            }
        });
    }
    function configureExpress() {
        app.set("port", port);
        app.use(logger("dev"));
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({ extended: false }));
        server.listen(port);
        server.on("error", onError);
        server.on("listening", onListening);
    }
    function normalizePort(val) {
        const portNumber = (typeof val === "string") ? parseInt(val, 10) : val;
        if (isNaN(portNumber))
            return val;
        else if (portNumber >= 0)
            return portNumber;
        else
            return false;
    }
    function onError(error) {
        if (error.syscall !== "listen")
            throw error;
        const bind = (typeof port === "string") ? "Pipe " + port : "Port " + port;
        switch (error.code) {
            case "EACCES":
                console.error(`${bind} requires elevated privileges`);
                process.exit(1);
                break;
            case "EADDRINUSE":
                console.error(`${bind} is already in use`);
                process.exit(1);
                break;
            default:
                throw error;
        }
    }
    function onListening() {
        const addr = server.address();
        const bind = (typeof addr === "string") ? `pipe ${addr}` : `port ${addr.port}`;
        debug(`Listening on ${bind}`);
    }
    console.log(`Express started on port ${port}`);
})).catch((error) => console.log(error));
//# sourceMappingURL=index.js.map
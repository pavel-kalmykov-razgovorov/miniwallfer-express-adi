import "reflect-metadata"
import { createConnection } from "typeorm"
import server = require("./server")

createConnection().then((connection) => {
    server.createServer();
}).catch((error) => console.log(error))

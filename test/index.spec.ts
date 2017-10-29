import * as chai from "chai"
import chaiHttp = require("chai-http")
import "chai/register-should"
import * as HttpStatus from "http-status-codes"
import * as mocha from "mocha"
import "reflect-metadata"
import { createConnection } from "typeorm";
import { SqliteConnectionOptions } from "typeorm/driver/sqlite/SqliteConnectionOptions";
import * as util from "util"
import * as app from "../src/index"
import server = require("../src/server")
import { getConnection } from "./testConnection"

process.env.NODE_ENV = "test"

chai.use(chaiHttp)
const should = chai.should()

const jwtTestSecret = "putopavel123";

describe("Example test", async () => {
    let testServer = null
    before("Starting server...", async () => {
        await getConnection.then(async (connection) => {
            testServer = server.createServer()
        }).catch((error) => console.log(error))
    })

    describe("Index test", () => {
        it("Test example", async () => {
            const res = await chai.request(testServer).get("/") as ChaiHttp.Response
            res.status.should.be.equal(HttpStatus.OK)
            res.should.be.html
            res.text.should.not.be.null
            res.text.should.include("swagger").and.include("pr18@alu.ua.es")
        })

    })
})

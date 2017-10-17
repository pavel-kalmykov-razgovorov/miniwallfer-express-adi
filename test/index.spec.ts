import * as chai from "chai"
import chaiHttp = require("chai-http")
import "chai/register-should"
import * as HttpStatus from "http-status-codes"
import * as mocha from "mocha"
import "reflect-metadata"
import * as util from "util"
import * as app from "../src/index"

chai.use(chaiHttp)
const expect = chai.expect

let server = null
async function initServer() {
    server = await app.default
}
before("Starting server...", initServer)

describe("Index test", () => {

    it("Test example", async () => {
        chai.request(server).get("/")
            .then((res) => {
                res.status.should.be.equal(HttpStatus.OK)
                res.should.be.html
                res.text.should.not.be.null
                    .and.include("swagger")
                    .and.include("pr18@alu.ua.es")
            })
    })

})

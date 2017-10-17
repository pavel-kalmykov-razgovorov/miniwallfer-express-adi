import * as chai from "chai"
import chaiHttp = require("chai-http")
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
                expect(res.status).to.equal(HttpStatus.OK)
                expect(res).to.be.html
                expect(res.text).to.be.not.null
                expect(res.text).to.include("swagger")
                    .and.to.include("pr18@alu.ua.es")
            })
    })

})

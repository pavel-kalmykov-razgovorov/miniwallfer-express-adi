import * as chai from "chai"
import chaiHttp = require("chai-http")
import * as HttpStatus from "http-status-codes"
import * as mocha from "mocha"
import "reflect-metadata"
import * as util from "util"
import * as app from "../../src/index"

chai.use(chaiHttp)
const expect = chai.expect

let server = null
async function initServer() {
    server = await app.default
}

before("Starting server...", initServer)

describe("UserController GET / Test", () => {

    it("Must throw UNAUTHORIZED if token is not provided", async () => {
        return chai.request(server).get("/users")
            .then((res) => expect.fail("should have failed with " + HttpStatus.UNAUTHORIZED))
            .catch((err) => {
                expect(err.response).to.have.status(HttpStatus.UNAUTHORIZED)
                expect(err.response.body.message).to.be.equal("Authorization header must be provided")
            })
    })

})

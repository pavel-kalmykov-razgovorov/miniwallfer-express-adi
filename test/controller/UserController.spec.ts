import * as chai from "chai"
import chaiHttp = require("chai-http")
import chaiMatchPattern = require("chai-match-pattern")
import "chai/register-should"
import * as HttpStatus from "http-status-codes"
import * as mocha from "mocha"
import "reflect-metadata"
import { getRepository } from "typeorm"
import * as util from "util"
import { Post } from "../../src/entity/Post"
import { User } from "../../src/entity/User"
import * as app from "../../src/index"

process.env.NODE_ENV = "test";

chai.use(chaiHttp)
chai.use(chaiMatchPattern)
const should = chai.should()
const _ = chaiMatchPattern.getLodashModule()

let server = null
async function initServer() {
    server = await app.default
}

before("Starting server...", initServer)

/**
 * To run the test, DB must be manually populated with the following user:
 * {
 *     "id": 1
 *     "username": "paveltrufi",
 *     "password": "mysecret123", //DB Must store it like "$2a$04$QIcPLFwcH1aoO412H.XlY.U.HE3CN5fvG0LuYsrkSSLKMTrehYH.6"
 *     "firstName": "Pavel",
 *     "lastName": "Razgovorov",
 *     "birthdate": "1996-11-27"
 * }
 */
// tslint:disable-next-line:max-line-length
const pavelToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJwYXZlbHRydWZpIiwicGFzc3dvcmQiOiIkMmEkMDQkUUljUExGd2NIMWFvTzQxMkguWGxZLlUuSEUzQ041ZnZHMEx1WXNya1NTTEtNVHJlaFlILjYiLCJmaXJzdE5hbWUiOiJQYXZlbCIsImxhc3ROYW1lIjoiUmF6Z292b3JvdiIsImJpcnRoZGF0ZSI6IjE5OTYtMTEtMjdUMDA6MDA6MDAuMDAwWiJ9.Ye4hwVzKTmyyIz6JIvxdI4zF9teQmFA7DjxsHurUxPs"
// tslint:disable-next-line:max-line-length
const unexistentUserToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJwYXZlbHRydWZpMiIsInBhc3N3b3JkIjoiJDJhJDA0JDlNZFVZUllqckQ4YkxOZXV0Y2FUcC5VejV4djdRSjVuRlJUdFIvbEdmdGptOXphQWR3RlZTIiwiZmlyc3ROYW1lIjoiUGF2ZWwiLCJsYXN0TmFtZSI6IlJhemdvdm9yb3YiLCJiaXJ0aGRhdGUiOiIxOTk2LTExLTI3VDAwOjAwOjAwLjAwMFoifQ.GB1xIKQye37dJfQNN4q95PzWnt7dTahDSNfUV381yC4"

describe("UserController authentication Test", () => {
    it("Must throw UNAUTHORIZED if token is not provided", (done) => {
        chai.request(server).get("/users")
            .end((err, res) => {
                err.should.not.be.null
                res.should.have.status(HttpStatus.UNAUTHORIZED)
                res.should.have.header("content-type", /application\/json.*/)
                res.body.should.have.deep.property("message", "Authorization header must be provided")
                done()
            })
    })

    it("Must throw UNAUTHORIZED if token doesn't have 'Bearer' keyword", (done) => {
        chai.request(server).get("/users")
            .set("Authorization", pavelToken)
            .end((err, res) => {
                err.should.not.be.null
                res.should.have.status(HttpStatus.UNAUTHORIZED)
                res.should.have.header("content-type", /application\/json.*/)
                res.body.should.have.deep.property("message",
                    "Malformed Authorization header (must be 'Bearer' + token)")
                done()
            })
    })

    it("Must throw UNAUTHORIZED if token has been manipulated", (done) => {
        chai.request(server).get("/users")
            .set("Authorization", `Bearer hacked${pavelToken}hacked`)
            .end((err, res) => {
                err.should.not.be.null
                res.should.have.status(HttpStatus.UNAUTHORIZED)
                res.should.have.header("content-type", /application\/json.*/)
                res.body.should.have.deep.property("message", "Unable to parse token")
                done()
            })
    })

    it("Must throw UNAUTHORIZED if token's owner (the user) has been deleted or doesn't exist", (done) => {
        chai.request(server).get("/users")
            .set("Authorization", `Bearer ${unexistentUserToken}`)
            .end((err, res) => {
                err.should.not.be.null
                res.should.have.status(HttpStatus.UNAUTHORIZED)
                res.should.have.header("content-type", /application\/json.*/)
                res.body.should.have.deep.property("message", "Invalid token. User may have been deleted")
                done()
            })
    })

    it("Must return the requested resource if a valid token is provided", (done) => {
        chai.request(server).get("/users/1")
            .set("Authorization", `Bearer ${pavelToken}`)
            .end((err, res) => {
                should.not.exist(err)
                res.should.have.status(HttpStatus.OK)
                res.should.have.header("content-type", /application\/hal\+json.*/)
                res.body.should.have.nested.property("_embedded.username", "paveltrufi")
                done()
            })
    })
})

describe("UserController GET all users test", () => {
    it("Must throw BAD REQUEST if there aren't start and size query parameters", (done) => {
        chai.request(server).get("/users")
            .set("Authorization", `Bearer ${pavelToken}`)
            .end((err, res) => {
                should.exist(err)
                res.should.have.status(HttpStatus.BAD_REQUEST)
                res.should.have.header("content-type", /application\/json.*/)
                res.body.should.have.deep.property("message",
                    "Lists must be paginated with start=<num>&size=<num> query params (use 0 to list all)")
                done()
            })
    })

    it("Must throw BAD REQUEST if start or size query params have any not-numeric value", (done) => {
        chai.request(server).get("/users")
            .set("Authorization", `Bearer ${pavelToken}`)
            .query({ start: "0", size: "A" })
            .end((err, res) => {
                should.exist(err)
                res.should.have.status(HttpStatus.BAD_REQUEST)
                res.should.have.header("content-type", /application\/json.*/)
                res.body.should.have.deep.property("message",
                    "Lists must be paginated with start=<num>&size=<num> query params (use 0 to list all)")
                done()
            })
    })

    it("Must return a users' list if start or size query params exist but don't have any value", (done) => {
        chai.request(server).get("/users")
            .set("Authorization", `Bearer ${pavelToken}`)
            .query({ start: "", size: "" })
            .end((err, res) => {
                should.not.exist(err)
                res.should.have.status(HttpStatus.OK)
                res.should.have.header("content-type", /application\/hal\+json.*/)
                res.body.should.have.property("_embedded")
                res.body._embedded.should.be.an("array").that.is.not.empty
                const firstUser = res.body._embedded[0];
                checkUserSchema(firstUser);
                done()
            })
    })
})

describe("UserController GET one user test", () => {
    it("Must return NOT FOUND if user's ID doesn't exist", (done) => {
        const unexistentUserId = "one" // It can be a string too...
        chai.request(server).get(`/users/${unexistentUserId}`)
            .set("Authorization", `Bearer ${pavelToken}`)
            .end((err, res) => {
                should.exist(err)
                res.should.have.status(HttpStatus.NOT_FOUND)
                res.should.have.header("content-type", /application\/json.*/)
                res.body.should.have.property("message", `Cannot find user by the given id: ${unexistentUserId}`)
                done()
            })
    })

    it("Must return the requested user if its ID is given in the URL", (done) => {
        const userId = 1
        chai.request(server).get(`/users/${userId}`)
            .set("Authorization", `Bearer ${pavelToken}`)
            .end((err, res) => {
                should.not.exist(err)
                res.should.have.status(HttpStatus.OK)
                res.should.have.header("content-type", /application\/hal\+json.*/)
                res.body.should.have.property("_embedded")
                checkUserSchema(res.body._embedded)
                res.body.should.have.nested.property("_links.posts.href")
                res.body._links.posts.href.should.be.a("string").that.is.eql(`/users/${userId}/posts?start=&size=`)
                res.body.should.have.nested.property("_links.posts.templated")
                res.body._links.posts.templated.should.be.a("boolean").that.is.eql(true)
                done()
            })
    })
})

function checkUserSchema(firstUser: any) {
    firstUser.should.matchPattern({
        id: _.isNumber,
        username: _.isString,
        password: _.isOmitted,
        firstName: _.isString,
        lastName: _.isString,
        birthdate: _.isDateString,
    });
}

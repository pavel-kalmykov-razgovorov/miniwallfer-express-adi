import * as chai from "chai"
import chaiHttp = require("chai-http")
import chaiMatchPattern = require("chai-match-pattern")
import "chai/register-should"
import { classToPlain, plainToClass } from "class-transformer"
import * as HttpStatus from "http-status-codes"
import * as jwt from "jwt-simple"
import * as mocha from "mocha"
import "reflect-metadata"
import { createConnection, getRepository, Repository } from "typeorm"
import { SqliteConnectionOptions } from "typeorm/driver/sqlite/SqliteConnectionOptions";
import * as util from "util"
import { Post } from "../../src/entity/Post"
import { User } from "../../src/entity/User"
import server = require("../../src/server")
import { getConnection } from "../testConnection"

process.env.NODE_ENV = "test"

chai.use(chaiHttp)
chai.use(chaiMatchPattern)
const should = chai.should()
const _ = chaiMatchPattern.getLodashModule()

const jwtTestSecret = "putopavel123";

describe("UserController tests", async () => {
    const exampleUser = plainToClass(User, {
        username: "paveltrufi",
        password: "mysecret123",
        firstName: "Pavel",
        lastName: "Razgovorov",
        birthdate: "1996-11-27",
    })
    const unexistentUser = plainToClass(User, {
        username: "idontexist",
        password: "ihavenopass",
        firstName: "ihavenoname",
        lastName: "ihavenosurname",
        birthdate: "1970-01-01",
    })
    let testServer = null
    let userRepository: Repository<User> = null
    let savedUser = null
    let pavelToken = null
    let unexistentUserToken = null

    before("Starting server...", async () => {
        await getConnection.then(async (connection) => {
            await connection.createQueryBuilder().delete().from(User).execute();
            testServer = server.createServer()
            userRepository = connection.getRepository(User)
            savedUser = await userRepository.save(exampleUser)
            unexistentUserToken = jwt.encode(unexistentUser, jwtTestSecret)
            pavelToken = jwt.encode(savedUser, jwtTestSecret)
            // We delete the database to make sure whe're running a clean environment
        }).catch((error) => console.log(error))
    })

    describe("Authentication Tests", () => {
        it("Must throw UNAUTHORIZED if token is not provided", async () => {
            try {
                await chai.request(testServer).get("/users")
            } catch (error) {
                const res = error.response as ChaiHttp.Response
                res.should.have.status(HttpStatus.UNAUTHORIZED)
                res.should.have.header("content-type", /application\/json.*/)
                res.body.should.have.deep.property("message", "Authorization header must be provided")
            }
        })

        it("Must throw UNAUTHORIZED if token doesn't have 'Bearer' keyword", (done) => {
            chai.request(testServer).get("/users")
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
            chai.request(testServer).get("/users")
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
            chai.request(testServer).get("/users")
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
            chai.request(testServer).get("/users")
                .set("Authorization", `Bearer ${pavelToken}`)
                .query({ start: 0, size: 1 })
                .end((err, res) => {
                    should.not.exist(err)
                    res.should.have.status(HttpStatus.OK)
                    res.should.have.header("content-type", /application\/hal\+json.*/)
                    res.body.should.have.nested.property("_embedded[0].username", "paveltrufi")
                    done()
                })
        })
    })

    describe("UserController::all test", () => {
        it("Must throw BAD REQUEST if there aren't start and size query parameters", (done) => {
            chai.request(testServer).get("/users")
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
            chai.request(testServer).get("/users")
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
            chai.request(testServer).get("/users")
                .set("Authorization", `Bearer ${pavelToken}`)
                .query({ start: "", size: "" })
                .end((err, res) => {
                    should.not.exist(err)
                    res.should.have.status(HttpStatus.OK)
                    res.should.have.header("content-type", /application\/hal\+json.*/)
                    res.body.should.have.property("_embedded")
                    res.body._embedded.should.be.an("array").that.is.not.empty
                    const firstUser = res.body._embedded[0]
                    checkUserSchema(firstUser)
                    done()
                })
        })
    })

    describe("UserController::one test", () => {
        it("Must return NOT FOUND if user's ID doesn't exist", (done) => {
            const unexistentUserId = "one" // It can be a string too...
            chai.request(testServer).get(`/users/${unexistentUserId}`)
                .set("Authorization", `Bearer ${pavelToken}`)
                .end((err, res) => {
                    should.exist(err)
                    res.should.have.status(HttpStatus.NOT_FOUND)
                    res.should.have.header("content-type", /application\/json.*/)
                    res.body.should.have.deep.property("message",
                        `Cannot find user by the given id: ${unexistentUserId}`)
                    done()
                })
        })

        it("Must return the requested user if its ID is given in the URL", (done) => {
            const userId = savedUser.id
            chai.request(testServer).get(`/users/${userId}`)
                .set("Authorization", `Bearer ${pavelToken}`)
                .end((err, res) => {
                    should.not.exist(err)
                    res.should.have.status(HttpStatus.OK)
                    res.should.have.header("content-type", /application\/hal\+json.*/)
                    res.body.should.have.property("_embedded")
                    checkUserSchema(res.body._embedded)
                    res.body.should.have.nested.property("_links.posts.href")
                    res.body._links.posts.href.should.be.a("string")
                        .that.is.eql(`/users/${userId}/posts?start=&size=`)
                    res.body.should.have.nested.property("_links.posts.templated")
                    res.body._links.posts.templated.should.be.a("boolean").that.is.eql(true)
                    done()
                })
        })
    })

    describe("UserController::save test", () => {
        it("Should throw UNPROCESSABLE ENTITY if no User is passed in the request", (done) => {
            chai.request(testServer).post("/users")
                .end((err, res) => {
                    should.exist(err)
                    res.should.have.status(HttpStatus.UNPROCESSABLE_ENTITY)
                    res.should.have.header("content-type", /application\/json.*/)
                    res.body.should.have.deep.property("message", "Empty user data")
                    done()
                })
        })

        it("Should throw UNPROCESSABLE ENTITY if an invalid or incomplete user is sent", (done) => {
            chai.request(testServer).post("/users")
                .send({ username: "1234", password: "pass" })
                .end((err, res) => {
                    should.exist(err)
                    res.should.have.status(HttpStatus.UNPROCESSABLE_ENTITY)
                    res.should.have.header("content-type", /application\/json.*/)
                    res.body.should.have.deep.property("message", [{
                        value: "1234",
                        property: "username",
                        children: [],
                        constraints: {
                            matches: "Username must be a valid nickname with a lenght between 8 and 20 characters",
                        },
                    }, {
                        value: "pass",
                        property: "password",
                        children: [],
                        constraints: { length: "password must be longer than 8 characters" },
                    }, {
                        property: "firstName",
                        children: [],
                        constraints: {
                            matches: "First name must be a valid name (no numbers, no special characters)",
                            isNotEmpty: "firstName should not be empty",
                        },
                    }, {
                        property: "lastName",
                        children: [],
                        constraints: {
                            matches: "Last name must be a valid name (no numbers, no special characters)",
                            isNotEmpty: "lastName should not be empty",
                        },
                    }, {
                        property: "birthdate",
                        children: [],
                        constraints: {
                            isDate: "birthdate must be a Date instance",
                            isNotEmpty: "birthdate should not be empty",
                        },
                    }])
                    done()
                })
        })

        it("Should throw UNPROCESSABLE ENTITY if the username is already taken", (done) => {
            const alreadyTakenUsername = "paveltrufi"
            chai.request(testServer).post("/users")
                .send({
                    username: alreadyTakenUsername,
                    password: "password",
                    firstName: "Pavel",
                    lastName: "Razgovorov",
                    birthdate: "1996-11-27",
                })
                .end((err, res) => {
                    should.exist(err)
                    res.should.have.status(HttpStatus.UNPROCESSABLE_ENTITY)
                    res.should.have.header("content-type", /application\/json.*/)
                    res.body.should.have.deep.property("message", `Username ${alreadyTakenUsername} already taken`)
                    done()
                })
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
    })
}

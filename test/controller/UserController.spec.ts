import * as chai from "chai"
import chaiHttp = require("chai-http")
import chaiMatchPattern = require("chai-match-pattern")
import "chai/register-should"
import { plainToClass } from "class-transformer"
import * as HttpStatus from "http-status-codes"
import * as jwt from "jwt-simple"
import "reflect-metadata"
import { Repository } from "typeorm"
import { User } from "../../src/entity/User"
import server = require("../../src/server")
import { getConnection } from "../testConnection"

process.env.NODE_ENV = "test"

chai.use(chaiHttp)
chai.use(chaiMatchPattern)
const should = chai.should()
const _ = chaiMatchPattern.getLodashModule()

const jwtTestSecret = "putopavel123"

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
    const userAssertionErrors = [{
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
    }]
    let testConnection = null
    let testServer = null
    let testUserRepository: Repository<User> = null
    let testSavedUser = null
    let pavelToken = null
    let unexistentUserToken = null

    before("Starting testing server...", async () => {
        await getConnection.then(async (connection) => {
            testConnection = connection
            testServer = server.createServer()
            testUserRepository = testConnection.getRepository(User)
            await testConnection.createQueryBuilder().delete().from(User).execute()
            testSavedUser = await testUserRepository.save(exampleUser)
            unexistentUserToken = jwt.encode(unexistentUser, jwtTestSecret)
            pavelToken = jwt.encode(testSavedUser, jwtTestSecret)
        }).catch((error) => console.log(error))
    })

    beforeEach("Cleaning database...", async () => {
        await testConnection.createQueryBuilder().delete().from(User).execute()
        testSavedUser = await testUserRepository.save(exampleUser)
    })

    describe("Authentication tests", () => {
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

        it("Must throw UNAUTHORIZED if token doesn't have 'Bearer' keyword", async () => {
            try {
                await chai.request(testServer).get("/users").set("authorization", pavelToken)
            } catch (error) {
                const res = error.response as ChaiHttp.Response
                res.should.have.status(HttpStatus.UNAUTHORIZED)
                res.should.have.header("content-type", /application\/json.*/)
                res.body.should.have.deep.property("message",
                    "Malformed Authorization header (must be 'Bearer' + token)")
            }
        })

        it("Must throw UNAUTHORIZED if token has been manipulated", async () => {
            try {
                await chai.request(testServer).get("/users")
                    .set("authorization", `Bearer hacked${pavelToken}hacked`)
            } catch (error) {
                const res = error.response as ChaiHttp.Response
                res.should.have.status(HttpStatus.UNAUTHORIZED)
                res.should.have.header("content-type", /application\/json.*/)
                res.body.should.have.deep.property("message", "Unable to parse token")
            }
        })

        it("Must throw UNAUTHORIZED if token's owner (the user) has been deleted or doesn't exist", async () => {
            try {
                await chai.request(testServer).get("/users")
                    .set("authorization", `Bearer ${unexistentUserToken}`)
            } catch (error) {
                const res = error.response as ChaiHttp.Response
                res.should.have.status(HttpStatus.UNAUTHORIZED)
                res.should.have.header("content-type", /application\/json.*/)
                res.body.should.have.deep.property("message", "Invalid token. User may have been deleted")
            }
        })

        it("Must return the requested resource if a valid token is provided", async () => {
            const res = await chai.request(testServer).get("/users")
                .set("authorization", `Bearer ${pavelToken}`)
                .query({ start: 0, size: 1 })
            res.should.have.status(HttpStatus.OK)
            res.should.have.header("content-type", /application\/hal\+json.*/)
            res.body.should.have.nested.property("_embedded[0].username", "paveltrufi")
        })
    })

    describe("UserController::all tests", () => {
        it("Must throw BAD REQUEST if there aren't start and size query parameters", async () => {
            try {
                await chai.request(testServer).get("/users")
                    .set("authorization", `Bearer ${pavelToken}`)
            } catch (error) {
                const res = error.response as ChaiHttp.Response
                res.should.have.status(HttpStatus.BAD_REQUEST)
                res.should.have.header("content-type", /application\/json.*/)
                res.body.should.have.deep.property("message",
                    "Lists must be paginated with start=<num>&size=<num> query params (use 0 to list all)")
            }
        })

        it("Must throw BAD REQUEST if start or size query params have any not-numeric value", async () => {
            try {
                await chai.request(testServer).get("/users")
                    .set("authorization", `Bearer ${pavelToken}`)
                    .query({ start: "0", size: "A" })
            } catch (error) {
                const res = error.response as ChaiHttp.Response
                res.should.have.status(HttpStatus.BAD_REQUEST)
                res.should.have.header("content-type", /application\/json.*/)
                res.body.should.have.deep.property("message",
                    "Lists must be paginated with start=<num>&size=<num> query params (use 0 to list all)")
            }
        })

        it("Must return a users' list if start or size query params exist but don't have any value", async () => {
            try {
                await chai.request(testServer).get("/users")
                    .set("authorization", `Bearer ${pavelToken}`)
                    .query({ start: "", size: "" })
            } catch (error) {
                const res = error.response as ChaiHttp.Response
                res.should.have.status(HttpStatus.OK)
                res.should.have.header("content-type", /application\/hal\+json.*/)
                res.body.should.have.property("_embedded")
                res.body._embedded.should.be.an("array").that.is.not.empty
                const firstUser = res.body._embedded[0]
                checkUserSchema(firstUser)
            }
        })
    })

    describe("UserController::one tests", () => {
        it("Must return NOT FOUND if user's ID doesn't exist", async () => {
            const unexistentUserId = "one" // It can be a string too...
            try {
                await chai.request(testServer).get(`/users/${unexistentUserId}`)
                    .set("authorization", `Bearer ${pavelToken}`)
            } catch (error) {
                const res = error.response as ChaiHttp.Response
                res.should.have.status(HttpStatus.NOT_FOUND)
                res.should.have.header("content-type", /application\/json.*/)
                res.body.should.have.deep.property("message",
                    `Cannot find user by the given id: ${unexistentUserId}`)
            }
        })

        it("Must return the requested user if its ID is given in the URL", async () => {
            const userId = testSavedUser.id
            const res = await chai.request(testServer).get(`/users/${userId}`)
                .set("authorization", `Bearer ${pavelToken}`)
            res.should.have.status(HttpStatus.OK)
            res.should.have.header("content-type", /application\/hal\+json.*/)
            res.body.should.have.property("_embedded")
            checkUserSchema(res.body._embedded)
            res.body.should.have.nested.property("_links.posts.href")
            res.body._links.posts.href.should.be.a("string")
                .that.is.eql(`/users/${userId}/posts?start=&size=`)
            res.body.should.have.nested.property("_links.posts.templated")
            res.body._links.posts.templated.should.be.a("boolean").that.is.eql(true)
        })
    })

    describe("UserController::save tests", () => {
        it("Should throw UNPROCESSABLE ENTITY if no User is passed in the request", async () => {
            try {
                await chai.request(testServer)
                    .post("/users")
                    .set("content-type", "application/json")
            } catch (error) {
                const res = error.response as ChaiHttp.Response
                res.should.have.status(HttpStatus.UNPROCESSABLE_ENTITY)
                res.should.have.header("content-type", /application\/json.*/)
                res.body.should.have.deep.property("message", "Empty user data")
            }
        })

        it("Should throw UNPROCESSABLE ENTITY if an invalid or incomplete user is sent", async () => {
            try {
                await chai.request(testServer)
                    .post("/users")
                    .set("content-type", "application/json")
                    .send({ username: "1234", password: "pass" })
            } catch (error) {
                const res = error.response as ChaiHttp.Response
                res.should.have.status(HttpStatus.UNPROCESSABLE_ENTITY)
                res.should.have.header("content-type", /application\/json.*/)
                res.body.should.have.deep.property("message", userAssertionErrors)
            }
        })

        it("Should throw UNPROCESSABLE ENTITY if the username is already taken", async () => {
            try {
                await chai.request(testServer)
                    .post("/users")
                    .set("content-type", "application/json")
                    .send({
                        username: testSavedUser.username,
                        password: "12345678",
                        firstName: "Already",
                        lastName: "Taken",
                        birthdate: "1999-12-31",
                    })
            } catch (error) {
                const res = error.response as ChaiHttp.Response
                res.should.have.status(HttpStatus.UNPROCESSABLE_ENTITY)
                res.should.have.header("content-type", /application\/json.*/)
                res.body.should.have.deep.property("message", `Username ${testSavedUser.username} already taken`)
            }
        })

        it("Should save the user in the DB if every field is correct", async () => {
            const user = plainToClass(User, {
                username: "everythingok",
                password: "3v3ryth1ng0k",
                firstName: "Everything",
                lastName: "Ok",
                birthdate: "1999-12-31",
            })
            const res = await chai.request(testServer)
                .post("/users")
                .set("content-type", "application/json")
                .send(user)
            res.should.have.status(HttpStatus.CREATED)
            res.body.should.have.property("_embedded")
            const savedUser = plainToClass(User, res.body._embedded as object)
            // We make sure the saved user is in the DB
            const count = await testUserRepository.count({ where: { username: savedUser.username } })
            count.should.be.eql(1)
            // We equalize missing properties from one to another object and check everyting was saved properly
            user.id = savedUser.id
            savedUser.password = user.password
            savedUser.should.be.eql(user)
        })
    })

    // FIXME
    // describe("UserController::update tests", () => {
    //     it("Should throw UNPROCESSABLE ENTITY if no User is passed in the request", async () => {
    //         try {
    //             await chai.request(testServer)
    //                 .put(`/users/${testSavedUser.id}`)
    //                 .set("content-type", "application/json")
    //                 .set("authorization", `Bearer ${pavelToken}`)
    //             } catch (error) {
    //                 const res = error.response as ChaiHttp.Response
    //                 res.should.have.status(HttpStatus.UNPROCESSABLE_ENTITY)
    //                 res.should.have.header("content-type", /application\/json.*/)
    //                 res.body.should.have.deep.property("message", "Empty user data")
    //             }
    //     })

    //     it("Should throw UNPROCESSABLE ENTITY if an invalid or incomplete user is sent", async () => {
    //         try {
    //             await chai.request(testServer)
    //                 .put(`/users/${testSavedUser.id}`)
    //                 .set("content-type", "application/json")
    //                 .set("authorization", `Bearer ${pavelToken}`)
    //                 .send({ username: "1234", password: "pass" })
    //         } catch (error) {
    //             const res = error.response as ChaiHttp.Response
    //             res.should.have.status(HttpStatus.UNPROCESSABLE_ENTITY)
    //             res.should.have.header("content-type", /application\/json.*/)
    //             res.body.should.have.deep.property("message", userAssertionErrors)
    //         }
    //     })

    //     it("Should throw UNPROCESSABLE ENTITY if the username is already taken", async () => {
    //         try {
    //             await chai.request(testServer)
    //                 .put(`/users/${testSavedUser.id}`)
    //                 .set("content-type", "application/json")
    //                 .set("authorization", `Bearer ${pavelToken}`)
    //                 .send(testSavedUser)
    //         } catch (error) {
    //             const res = error.response as ChaiHttp.Response
    //             res.should.have.status(HttpStatus.UNPROCESSABLE_ENTITY)
    //             res.should.have.header("content-type", /application\/json.*/)
    //             res.body.should.have.deep.property("message", `Username ${testSavedUser.username} already taken`)
    //         }
    //     })
    // })
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

import * as chai from "chai"
import chaiHttp = require("chai-http")
import chaiMatchPattern = require("chai-match-pattern")
import "chai/register-should"
import { plainToClass } from "class-transformer"
import * as HttpStatus from "http-status-codes"
import * as jwt from "jwt-simple"
import "reflect-metadata"
import { Repository } from "typeorm"
import { Post } from "../../src/entity/Post";
import { User } from "../../src/entity/User"
import server = require("../../src/server")
import { getConnection } from "../testConnection"

process.env.NODE_ENV = "test"

chai.use(chaiHttp)
chai.use(chaiMatchPattern)
const should = chai.should()
const _ = chaiMatchPattern.getLodashModule()

const jwtTestSecret = "putopavel123"

describe("PostController tests", () => {
    const exampleUser = plainToClass(User, {
        username: "paveltrufi",
        password: "mysecret123",
        firstName: "Pavel",
        lastName: "Razgovorov",
        birthdate: "1996-11-27",
    })
    const examplePost = plainToClass(Post, {
        text: "This is a post example",
        user: exampleUser,
    })
    let testConnection = null
    let testServer = null
    let testUserRepository: Repository<User> = null
    let testPostRepository: Repository<Post> = null
    let testSavedUser = null
    let testSavedPost = null
    let pavelToken = null

    before("Starting testing server...", async () => {
        await getConnection.then(async (connection) => {
            testConnection = connection
            testServer = server.createServer()
            testUserRepository = testConnection.getRepository(User)
            testPostRepository = testConnection.getRepository(Post)
            await testConnection.createQueryBuilder().delete().from(User).execute()
            testSavedUser = await testUserRepository.save(exampleUser)
            pavelToken = jwt.encode(testSavedUser, jwtTestSecret)
        }).catch((error) => console.log(error))
    })

    beforeEach("Cleaning database...", async () => {
        await testConnection.createQueryBuilder().delete().from(User).execute()
        await testConnection.createQueryBuilder().delete().from(Post).execute()
        testSavedUser = await testUserRepository.save(exampleUser)
        examplePost.user = testSavedUser
        testSavedPost = await testPostRepository.save(examplePost)
    })

    describe("PostController::all tests", () => {
        it("Must throw BAD REQUEST if there aren't start and size query parameters", async () => {
            try {
                await chai.request(testServer).get("/posts")
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
            const callAllUsersWithWrongQueryParams = async (start, size) => {
                try {
                    await chai.request(testServer).get("/posts")
                        .set("authorization", `Bearer ${pavelToken}`)
                        .query({ start, size })
                } catch (error) {
                    const res = error.response as ChaiHttp.Response
                    res.should.have.status(HttpStatus.BAD_REQUEST)
                    res.should.have.header("content-type", /application\/json.*/)
                    res.body.should.have.deep.property("message",
                        "Lists must be paginated with start=<num>&size=<num> query params (use 0 to list all)")
                }
            }

            callAllUsersWithWrongQueryParams(0, "A")
            callAllUsersWithWrongQueryParams("A", 0)
            callAllUsersWithWrongQueryParams("A", "A")
        })

        it("Must return a users' list if start or size query params exist but don't have any value", async () => {
            try {
                await chai.request(testServer).get("/posts")
                    .set("authorization", `Bearer ${pavelToken}`)
                    .query({ start: "", size: "" })
            } catch (error) {
                const res = error.response as ChaiHttp.Response
                res.should.have.status(HttpStatus.OK)
                res.should.have.header("content-type", /application\/hal\+json.*/)
                res.body.should.have.property("_embedded")
                res.body._embedded.should.be.an("array").that.is.not.empty
                const firstUser = res.body._embedded[0]
                checkPostSchema(firstUser)
            }
        })
    })
})

function checkPostSchema(post: any) {
    post.should.matchPattern({
        id: _.isNumber,
        text: _.isString,
        user: _.isObject,
    })
}

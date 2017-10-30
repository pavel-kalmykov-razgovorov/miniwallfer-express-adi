import * as chai from "chai"
import chaiHttp = require("chai-http")
import chaiMatchPattern = require("chai-match-pattern")
import "chai/register-should"
import { classToPlain, plainToClass } from "class-transformer"
import * as HttpStatus from "http-status-codes"
import * as jwt from "jwt-simple"
import "reflect-metadata"
import { Connection, Repository } from "typeorm"
import * as util from "util"
import { Post } from "../../src/entity/Post"
import { User } from "../../src/entity/User"
import server = require("../../src/server")
import { getConnection } from "../testConnection"

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
    const exampleAnotherUser = plainToClass(User, {
        username: "anotheruser",
        password: "anotherpass",
        firstName: "Another",
        lastName: "User",
        birthdate: "1995-11-27",
    })
    const examplePost = plainToClass(Post, {
        text: "This is a post example",
        user: exampleUser,
    })
    const exampleAnotherPost = plainToClass(Post, {
        text: "This is an another post example",
        user: exampleUser,
    })
    let testConnection: Connection = null
    let testServer = null
    let testUserRepository: Repository<User> = null
    let testPostRepository: Repository<Post> = null
    let testSavedUser: User = null
    let testAnotherSavedUser: User = null
    let testSavedPost: Post = null
    let testAnotherSavedPost: Post = null
    let pavelToken = null
    let anotherToken = null

    before("Starting testing server...", async () => {
        await getConnection.then(async (connection) => {
            testConnection = connection
            testServer = server.createServer()
            testUserRepository = testConnection.getRepository(User)
            testPostRepository = testConnection.getRepository(Post)
        }).catch((error) => console.log(error))
    })

    beforeEach("Cleaning database...", async () => {
        await testConnection.createQueryBuilder().delete().from(User).execute()
        await testConnection.createQueryBuilder().delete().from(Post).execute()
        testSavedUser = await testUserRepository.save(exampleUser)
        testAnotherSavedUser = await testUserRepository.save(exampleAnotherUser)
        pavelToken = jwt.encode(testSavedUser, jwtTestSecret)
        anotherToken = jwt.encode(testAnotherSavedUser, jwtTestSecret)
        examplePost.user = testSavedUser
        exampleAnotherPost.user = testAnotherSavedUser
        testSavedPost = await testPostRepository.save(examplePost)
        testAnotherSavedPost = await testPostRepository.save(exampleAnotherPost)
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

    describe("PostController::one tests", () => {
        it("Must return NOT FOUND if post's ID doesn't exist", async () => {
            const unexistentUserId = -1
            try {
                await chai.request(testServer).get(`/posts/${unexistentUserId}`)
                    .set("authorization", `Bearer ${pavelToken}`)
            } catch (error) {
                const res = error.response as ChaiHttp.Response
                res.should.have.status(HttpStatus.NOT_FOUND)
                res.should.have.header("content-type", /application\/json.*/)
                res.body.should.have.deep.property("message",
                    `Cannot find post by the given id: ${unexistentUserId}`)
            }
        })

        it("Must return NOT FOUND if post's ID isn't numeric", async () => {
            const unexistentUserId = "one"
            try {
                await chai.request(testServer).get(`/posts/${unexistentUserId}`)
                    .set("authorization", `Bearer ${pavelToken}`)
            } catch (error) {
                const res = error.response as ChaiHttp.Response
                res.should.have.status(HttpStatus.BAD_REQUEST)
                res.should.have.header("content-type", /application\/json.*/)
                res.body.should.have.deep.property("message", "Post's ID not present in URL")
            }
        })

        it("Must return the requested post if its ID is given in the URL", async () => {
            const postId = testSavedPost.id
            const res = await chai.request(testServer).get(`/posts/${postId}`)
                .set("authorization", `Bearer ${pavelToken}`)
            res.should.have.status(HttpStatus.OK)
            res.should.have.header("content-type", /application\/hal\+json.*/)
            res.body.should.have.property("_embedded")
            const post = res.body._embedded
            checkPostSchema(post)
            res.body.should.have.nested.property("_links.user.href")
            res.body._links.user.href.should.be.a("string")
                .that.is.eql(`/users/${post.user._embedded.id}`)
        })
    })

    describe("PostController::save tests", () => {
        it("Should throw BAD REQUEST if there's not any valid user's ID in the URL", async () => {
            try {
                await chai.request(testServer)
                    .post("/users/null/posts")
                    .set("authorization", `Bearer ${pavelToken}`)
                    .set("content-type", "application/json")
            } catch (error) {
                const res = error.response as ChaiHttp.Response
                res.should.have.status(HttpStatus.BAD_REQUEST)
                res.should.have.header("content-type", /application\/json.*/)
                res.body.should.have.deep.property("message", "User's ID not present in URL")
            }
        })

        it("Should throw UNATHORIZED if the user's ID in the URL and the token don't match", async () => {
            try {
                await chai.request(testServer)
                    .post("/users/0/posts")
                    .set("authorization", `Bearer ${pavelToken}`)
                    .set("content-type", "application/json")
            } catch (error) {
                const res = error.response as ChaiHttp.Response
                res.should.have.status(HttpStatus.UNAUTHORIZED)
                res.should.have.header("content-type", /application\/json.*/)
                res.body.should.have.deep.property("message", "Trying to access someone else's resources")
            }
        })

        it("Should throw UNPROCESSABLE ENTITY if no post is passed in the request", async () => {
            try {
                await chai.request(testServer)
                    .post(`/users/${testSavedUser.id}/posts`)
                    .set("authorization", `Bearer ${pavelToken}`)
                    .set("content-type", "application/json")
            } catch (error) {
                const res = error.response as ChaiHttp.Response
                res.should.have.status(HttpStatus.UNPROCESSABLE_ENTITY)
                res.should.have.header("content-type", /application\/json.*/)
                res.body.should.have.deep.property("message", "Empty user data")
            }
        })

        it("Should throw UNPROCESSABLE ENTITY if an incomplete post is sent", async () => {
            try {
                await chai.request(testServer)
                    .post(`/users/${testSavedUser.id}/posts`)
                    .set("authorization", `Bearer ${pavelToken}`)
                    .set("content-type", "application/json")
                    .send({ text: "" })
            } catch (error) {
                const res = error.response as ChaiHttp.Response
                res.should.have.status(HttpStatus.UNPROCESSABLE_ENTITY)
                res.should.have.header("content-type", /application\/json.*/)
                res.body.should.have.deep.property("message", [{
                    property: "text",
                    value: "",
                    children: [],
                    constraints: {
                        isNotEmpty: "text should not be empty",
                    },
                }])
            }
        })

        it("Should save the user in the DB if every field is correct", async () => {
            const res = await chai.request(testServer)
                .post(`/users/${testSavedUser.id}/posts`)
                .set("authorization", `Bearer ${pavelToken}`)
                .set("content-type", "application/json")
                .send({ text: examplePost.text })
            // Won't throw unique constraint because equal posts (same text and user) *are allowed*
            res.should.have.status(HttpStatus.CREATED)
            res.body.should.have.property("_embedded")
            const savedPost = res.body._embedded
            // We make sure the saved user is in the DB
            const count = await testPostRepository.count({ where: { text: savedPost.text } })
            count.should.be.eql(2) // The already inserted plus the new one
            savedPost.should.have.deep.property("text", examplePost.text)
            // For some reason it's impossible to check the hole object,
            // even if you delete the password and format the birthdate to ISO String from the original object
            savedPost.should.have.nested.property("user._embedded.id", testSavedUser.id)
        })
    })

    describe("PostController::remove tests", () => {
        const callDeletePostWithError = async (userId, postId, status: number, errorMessage: string) => {
            try {
                await chai.request(testServer)
                    .del(`/users/${userId}/posts/${postId}`)
                    .set("authorization", `Bearer ${pavelToken}`)
            } catch (error) {
                const res = error.response as ChaiHttp.Response
                res.should.have.status(status)
                res.should.have.header("content-type", /application\/json.*/)
                res.body.should.have.deep.property("message", errorMessage)
            }
        }

        it("Must return BAD REQUEST if user's ID is not numeric", async () => {
            await callDeletePostWithError("one", "two", HttpStatus.BAD_REQUEST, "User's ID not present in URL")
        })

        it("Must return BAD REQUEST if posts's ID is not numeric", async () => {
            await callDeletePostWithError(0, "two", HttpStatus.BAD_REQUEST, "Post's ID not present in URL")
        })

        it("Must return UNAUTHORIZED if user isn't the post owner", async () => {
            await callDeletePostWithError(testAnotherSavedUser.id, 0, HttpStatus.UNAUTHORIZED,
                "Trying to access someone else's resources")
        })

        it("Must return NOT FOUND if post doesn't exist", async () => {
            await callDeletePostWithError(testSavedUser.id, 0, HttpStatus.NOT_FOUND,
                "Cannot find post to remove by the given id: 0")
        })

        it("Must return NO CONTENT if post has been deleted", async () => {
            const res = await chai.request(testServer)
                .del(`/users/${testSavedUser.id}/posts/${testSavedPost.id}`)
                .set("authorization", `Bearer ${pavelToken}`)
            res.should.have.status(HttpStatus.NO_CONTENT)
            res.should.not.have.header("content-type")
            res.body.should.be.empty
            const postCount = await testConnection
                .createQueryBuilder()
                .select()
                .from(Post, "post")
                .whereInIds([testSavedPost.id])
                .getCount()
            postCount.should.be.eql(0)
        })

        // FIXME
        // it("Must return NOT FOUND if user is attempted to be deleted twice", async () => {
        //     const res = await chai.request(testServer)
        //         .del(`/users/${testSavedUser.id}`)
        //         .set("authorization", `Bearer ${pavelToken}`)
        //     callDeleteUserWithUnexistentUserId(testSavedUser.id)
        // })
    })
})

function checkPostSchema(post: any) {
    post.should.matchPattern({
        id: _.isNumber,
        text: _.isString,
        user: _.isObject,
    })
}

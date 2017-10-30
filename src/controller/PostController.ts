import { classToPlain } from "class-transformer"
import { transformAndValidate } from "class-transformer-validator"
import { NextFunction, Request, Response } from "express"
import * as HttpStatus from "http-status-codes"
import { getRepository } from "typeorm"
import * as util from "util"
import { Post } from "../entity/Post"
import { User } from "../entity/User"
import PostHalUtils from "../hateoas/PostHalUtils"
import { UserController } from "./UserController"

export class PostController {
    private userController = new UserController() // FIXME
    private postRepository = getRepository(Post)
    private userRepository = getRepository(User)

    /**
     * @swagger
     * /posts:
     *     get:
     *         tags:
     *             - Posts
     *         description: Retrieves all the posts stored in the DB
     *         operationId: "getAllPosts"
     *         produces:
     *             - application/hal+json
     *             - application/json
     *         parameters:
     *             - $ref: "#/parameters/startParam"
     *             - $ref: "#/parameters/sizeParam"
     *         responses:
     *             200:
     *                 $ref: "#/responses/Ok"
     *             400:
     *                 $ref: "#/responses/ListNotPaginated"
     *             401:
     *                 $ref: "#/responses/Unauthorized"
     *         security:
     *             - jwt: []
     */
    public async all(request: Request, response: Response, next: NextFunction) {
        const skip = Number(request.query.start)
        const take = Number(request.query.size)
        if (isNaN(skip) || isNaN(take)) {
            this.processError(
                new Error("Lists must be paginated with start=<num>&size=<num> query params (use 0 to list all)"),
                HttpStatus.BAD_REQUEST)
        }
        const postsAndCount = await this.postRepository.findAndCount({ skip, take })
        response.type("application/hal+json")
        return PostHalUtils.getPostsWithNavigationLinks(postsAndCount, request.path, skip, take)
    }

    /**
     * @swagger
     * /posts/{id}:
     *     get:
     *         tags:
     *             - Posts
     *         description: Retrieves a single post stored in the DB
     *         operationId: gePost
     *         produces:
     *             - application/hal+json
     *             - application/json
     *         parameters:
     *             - $ref: "#/parameters/id"
     *         responses:
     *             200:
     *                 $ref: "#/responses/Ok"
     *             400:
     *                 $ref: "#/responses/BadUrl"
     *             401:
     *                 $ref: "#/responses/Unauthorized"
     *             404:
     *                 $ref: "#/responses/EntityNotFound"
     *         security:
     *             - jwt: []
     */
    public async one(request: Request, response: Response, next: NextFunction) {
        const postId: number = request.params.id as number
        this.checkPostsId(postId)
        const post = await this.postRepository.findOneById(postId)
        if (!post) this.processError(new Error("Cannot find entity by a given id"), HttpStatus.NOT_FOUND, postId)
        response.type("application/hal+json")
        return PostHalUtils.getPostWithActionLinks(post)
    }

    /**
     * @swagger
     * /users/{id}/posts:
     *     post:
     *         tags:
     *             - Posts
     *         description: Saves a new post (from the given user) to the DB
     *         operationId: savePost
     *         produces:
     *             - application/hal+json
     *             - application/json
     *         parameters:
     *             - $ref: "#/parameters/id"
     *             - $ref: "#/parameters/newPost"
     *         responses:
     *             201:
     *                 $ref: "#/responses/Created"
     *             400:
     *                 $ref: "#/responses/BadUrl"
     *             422:
     *                 $ref: "#/responses/UnprocessableEntity"
     *         security:
     *             - jwt: []
     */
    public async save(request: Request, response: Response, next: NextFunction) {
        const userId = request.params.id
        const newPost = request.body
        this.checkUsersId(userId)
        await this.checkUserPermissions(request, response, next, userId)
        if (Post.isEmpty(newPost)) {
            this.processError(new Error("Empty user data"), HttpStatus.UNPROCESSABLE_ENTITY)
        }
        return transformAndValidate(Post, newPost, { validator: { validationError: { target: false } } })
            .then(async (validatedPost: Post) => {
                validatedPost.user = await this.userRepository.findOneById(userId)
                const savedPost = await this.postRepository.save(validatedPost)
                response.status(HttpStatus.CREATED)
                response.location(`${request.protocol}://${request.get("host")}${request.url}/${savedPost.id}`)
                response.type("application/hal+json")
                return PostHalUtils.getPostWithActionLinks(savedPost)
            })
            .catch((error) =>
                this.processError(error, HttpStatus.UNPROCESSABLE_ENTITY, undefined, userId))
    }

    /**
     * @swagger
     * /users/{userId}/posts/{postId}:
     *     put:
     *         tags:
     *             - Posts
     *         description: Updates a selected post (from the given user) and merges it to the DB
     *         operationId: updatePost
     *         produces:
     *             - application/hal+json
     *             - application/json
     *         parameters:
     *             - allOf:
     *                 - $ref: "#/parameters/id"
     *                 - name: "userId"
     *                 - description: "User's ID"
     *             - allOf:
     *                 - $ref: "#/parameters/id"
     *                 - name: "postId"
     *                 - description: "Post's ID"
     *             - $ref: "#/parameters/newPost"
     *         responses:
     *             201:
     *                 $ref: "#/responses/Created"
     *             400:
     *                 $ref: "#/responses/BadUrl"
     *             401:
     *                 $ref: "#/responses/Unauthorized"
     *             422:
     *                 $ref: "#/responses/UnprocessableEntity"
     *         security:
     *             - jwt: []
     */
    public async update(request: Request, response: Response, next: NextFunction) {
        await this.checkUsersAndPostsIds(request, response, next)
        const userId = request.params.userId
        const postId = request.params.postId
        const modifiedPost = request.body
        if (Post.isEmpty(modifiedPost)) this.processError(new Error("Empty post data"), HttpStatus.UNPROCESSABLE_ENTITY)
        return transformAndValidate(Post, modifiedPost, { validator: { validationError: { target: false } } })
            .then(async (validatedPost: Post) => {
                await this.postRepository.updateById(postId, validatedPost)
                response.status(HttpStatus.CREATED)
                response.type("application/hal+json")
                return PostHalUtils.getPostWithActionLinks(await this.postRepository.findOneById(postId))
            })
            .catch((error) =>
                this.processError(error, HttpStatus.UNPROCESSABLE_ENTITY, postId, modifiedPost.user.id))
    }

    /**
     * @swagger
     * /users/{userId}/posts/{postId}:
     *     delete:
     *         tags:
     *             - Posts
     *         description: Deletes a selected post (from the given user) from the DB
     *         operationId: deletePost
     *         produces:
     *             - application/json
     *         parameters:
     *             - allOf:
     *                 - $ref: "#/parameters/id"
     *                 - name: "userId"
     *                 - description: "User's ID"
     *             - allOf:
     *                 - $ref: "#/parameters/id"
     *                 - name: "postId"
     *                 - description: "Post's ID"
     *         responses:
     *             204:
     *                 $ref: "#/responses/EmptyResponse"
     *             400:
     *                 $ref: "#/responses/BadUrl"
     *             401:
     *                 $ref: "#/responses/Unauthorized"
     *             404:
     *                 $ref: "#/responses/EntityNotFound"
     *         security:
     *             - jwt: []
     */
    public async remove(request: Request, response: Response, next: NextFunction) {
        await this.checkUsersAndPostsIds(request, response, next)
        const userId = request.params.userId
        const postId = request.params.postId
        await this.postRepository.removeById(postId)
            .catch((error) => this.processError(error, HttpStatus.NOT_FOUND, postId))
        response.status(HttpStatus.NO_CONTENT).end()
    }

    private async checkUsersAndPostsIds(request: Request, response: Response, next: NextFunction) {
        const postId = request.params.postId
        const userId = request.params.userId
        this.checkPostsId(postId)
        this.checkUsersId(userId)
        await this.checkUserPermissions(request, response, next, userId)
    }

    private async checkUserPermissions(request: Request, response: Response, next: NextFunction, userId: number) {
        const user = await this.userController.getCurrentUser(request, response, next) as User
        if (user.id !== Number(userId)) {
            this.processError(new Error("Trying to access someone else's resources"), HttpStatus.UNAUTHORIZED)
        }
    }

    private checkUsersId(userId: number) {
        if (!userId || isNaN(userId)) {
            this.processError(new Error("User's ID not present in URL"), HttpStatus.BAD_REQUEST)
        }
    }

    private checkPostsId(postId: number) {
        if (!postId || isNaN(postId)) {
            this.processError(new Error("Post's ID not present in URL"), HttpStatus.BAD_REQUEST)
        }
    }

    /**
     * Processes any error thrown by the repository or even the DB.
     *
     * If the error is something like "Cannot find",
     * wich means that provided ID doesn't exist, it will customize the error.
     *
     * If the error is something like "FOREIGN KEY", wich is a DB constraint,
     * it will customize the error with the userId wich caused it.
     *
     * Otherwise, it will throw the error "as is"
     * @param error the error to process
     * @param status the http status code
     * @param postId the post's ID
     * @param userId the user's associated to the post ID
     */
    private processError(error: Error, status: number, postId?: number, userId?: number) {
        if (!error.message) throw { message: error, status }
        let message = error.message
        if (message.match(/.*Cannot find.*/i)) {
            status = HttpStatus.NOT_FOUND
            message = message
                .replace("entity", "post")
                .replace(/ a.*id/, ` the given id: ${postId}`)
        } else if (message.match(/.*FOREIGN KEY.*/i)) message = `Username with ID ${userId} doesn't exist`
        throw { message, status }
    }
}

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
    private userController = new UserController()
    private postRepository = getRepository(Post)

    public async all(request: Request, response: Response, next: NextFunction) {
        const skip = Number(request.query.start)
        const take = Number(request.query.size)
        if (isNaN(skip) || isNaN(take)) {
            this.processError(
                new Error("Lists must be paginated with start=<num>&size=<num> query params (use 0 to list all)"),
                HttpStatus.BAD_REQUEST)
        }
        const postsAndCount = await this.postRepository.findAndCount({ skip, take })
        return PostHalUtils.getPostsWithNavigationLinks(postsAndCount, request.path, skip, take)
    }

    public async one(request: Request, response: Response, next: NextFunction) {
        const postId: number = request.params.id as number
        this.checkPostsId(postId)
        const post = await this.postRepository.findOneById(postId)
        if (!post) this.processError(new Error("Cannot find entity by a given id"), HttpStatus.NOT_FOUND, postId)
        return PostHalUtils.getPostWithActionLinks(post)
    }

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
                validatedPost.user = new User()
                validatedPost.user.id = userId
                const savedPost = await this.postRepository.save(validatedPost)
                response.status(HttpStatus.CREATED)
                response.location(`${request.protocol}://${request.get("host")}${request.url}/${savedPost.id}`)
                return PostHalUtils.getPostWithActionLinks(savedPost)
            })
            .catch((error) =>
                this.processError(error, HttpStatus.UNPROCESSABLE_ENTITY, undefined, userId))
    }

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
                return PostHalUtils.getPostWithActionLinks(await this.postRepository.findOneById(postId))
            })
            .catch((error) =>
                this.processError(error, HttpStatus.UNPROCESSABLE_ENTITY, postId, modifiedPost.user.id))
    }

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

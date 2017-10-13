import { classToPlain } from "class-transformer";
import { transformAndValidate } from "class-transformer-validator"
import { NextFunction, Request, Response } from "express"
import * as HttpStatus from "http-status-codes"
import { getRepository } from "typeorm"
import * as util from "util"
import { Post } from "../entity/Post"
import { User } from "../entity/User"

export class PostController {
    private postRepository = getRepository(Post)

    public async all(request: Request, response: Response, next: NextFunction) {
        const posts = await this.postRepository.find()
        return classToPlain(posts)
    }

    public async one(request: Request, response: Response, next: NextFunction) {
        const postId: number = request.params.id as number;
        const post = await this.postRepository.findOneById(postId)
        if (!post) this.processError(new Error("Cannot find entity by a given id"), HttpStatus.NOT_FOUND, postId)
        return classToPlain(post)
    }

    public async save(request: Request, response: Response, next: NextFunction) {
        const newPost = request.body
        if (Object.keys(newPost).length === 0 && newPost.constructor === Object) {
            this.processError(new Error("Empty user data"), HttpStatus.BAD_REQUEST, undefined)
        }
        return transformAndValidate(Post, newPost, { validator: { validationError: { target: false } } })
            .then(async (validatedPost: Post) => {
                if (!validatedPost.user.id) {
                    this.processError(
                        new Error("User's post related entity must provide at least an ID"),
                        HttpStatus.BAD_REQUEST,
                        undefined)
                }
                const savedPost = await this.postRepository.save(validatedPost)
                response.status(HttpStatus.CREATED)
                response.location(`${request.protocol}://${request.get("host")}${request.url}/${savedPost.id}`)
                return classToPlain(savedPost)
            })
            .catch((error) =>
                this.processError(error, HttpStatus.BAD_REQUEST, undefined, newPost.user ? newPost.user.id : undefined))
    }

    public async update(request: Request, response: Response, next: NextFunction) {
        const postId = request.params.id;
        const modifiedPost = request.body
        if (Object.keys(modifiedPost).length === 0 && modifiedPost.constructor === Object) {
            response.status(HttpStatus.BAD_REQUEST).send({ message: "Empty user data" })
        }
        return transformAndValidate(Post, modifiedPost, { validator: { validationError: { target: false } } })
            .then(async (validatedPost: Post) => {
                await this.postRepository.updateById(postId, validatedPost)
                response.status(HttpStatus.CREATED)
                return this.one(request, response, next)
            })
            .catch((error) =>
                this.processError(error, HttpStatus.BAD_REQUEST, postId, modifiedPost.user.id))
    }

    public async remove(request: Request, response: Response, next: NextFunction) {
        const postId = request.params.id
        await this.postRepository.removeById(postId)
            .catch((error) => this.processError(error, HttpStatus.NOT_FOUND, postId))
        response.status(HttpStatus.NO_CONTENT).end()
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
     * @param message the raw error message
     * @param status the http status code
     * @param postId the post's ID
     * @param userId the user's associated to the post ID
     */
    private processError(error: Error, status: number, postId: number, userId?: number) {
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

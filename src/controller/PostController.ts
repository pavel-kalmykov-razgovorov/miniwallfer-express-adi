import { transformAndValidate } from "class-transformer-validator"
import { NextFunction, Request, Response } from "express"
import { getRepository } from "typeorm"
import * as util from "util"
import { Post } from "../entity/Post"
import { User } from "../entity/User"

export class PostController {
    private postRepository = getRepository(Post)

    public async all(request: Request, response: Response, next: NextFunction) {
        return this.postRepository.find()
    }

    public async one(request: Request, response: Response, next: NextFunction) {
        const postId: number = request.params.id as number;
        const post = await this.postRepository.findOneById(postId)
        if (post) return post
        else this.processRepositoryOrDbError(`Cannot find entity by a given id`, 400, postId)
    }

    public async save(request: Request, response: Response, next: NextFunction) {
        const newPost = request.body
        return transformAndValidate(Post, newPost, { validator: { validationError: { target: false } } })
            .then(async (validatedUser: Post) => {
                const savedPost = await this.postRepository.save(validatedUser)
                response.status(201)
                response.location(`${request.protocol}://${request.get("host")}${request.originalUrl}/${savedPost.id}`)
                return savedPost
            })
            .catch((error) => this.processRepositoryOrDbError(error.message, 400, undefined, newPost.user.id))
    }

    public async update(request: Request, response: Response, next: NextFunction) {
        const postId = request.params.id;
        const modifiedPost = request.body
        return transformAndValidate(Post, modifiedPost, { validator: { validationError: { target: false } } })
            .then(async (validatedPost: Post) => {
                await this.postRepository.updateById(postId, validatedPost)
                return this.one(request, response, next)
            })
            .catch((error) => this.processRepositoryOrDbError(error.message, 400, postId, modifiedPost.user.id))
    }

    public async remove(request: Request, response: Response, next: NextFunction) {
        const postId = request.params.id
        await this.postRepository.removeById(postId)
            .catch((error) => this.processRepositoryOrDbError(error.message, 404, postId))
        response.status(204).end()
    }

    private processRepositoryOrDbError(message: string, status: number, postId: number, userId?: number) {
        if (message.match(/.*Cannot find.*/i))
            message = message
                .replace("entity", "post")
                .replace(/ a.*id/, ` the given id: ${postId}`)
        else if (message.match(/.*FOREIGN KEY.*/i))
            message = `Username with ID ${userId} doesn't exist`
        throw { message, status }
    }
}

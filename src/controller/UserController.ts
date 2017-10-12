import { transformAndValidate } from "class-transformer-validator"
import { NextFunction, Request, Response } from "express"
import { getRepository } from "typeorm"
import * as util from "util"
import { User } from "../entity/User"

export class UserController {

    private userRepository = getRepository(User)

    public async all(request: Request, response: Response, next: NextFunction) {
        return this.userRepository.find()
    }

    public async one(request: Request, response: Response, next: NextFunction) {
        const userId: number = request.params.id as number;
        const user = await this.userRepository.findOneById(userId)
        if (user) return user
        else this.processRepositoryOrDbError(`Cannot find entity by a given id`, 400, userId)
    }

    public async save(request: Request, response: Response, next: NextFunction) {
        const newUser = request.body
        return transformAndValidate(User, newUser, { validator: { validationError: { target: false } } })
            .then(async (validatedUser: User) => {
                const savedUser = await this.userRepository.save(validatedUser)
                response.status(201)
                response.location(`${request.protocol}://${request.get("host")}${request.originalUrl}/${savedUser.id}`)
                return savedUser
            })
            .catch((error) => this.processRepositoryOrDbError(error.message, 400, undefined, newUser.username))
    }

    public async update(request: Request, response: Response, next: NextFunction) {
        const userId = request.params.id;
        const modifiedUser = request.body
        return transformAndValidate(User, modifiedUser, { validator: { validationError: { target: false } } })
            .then(async (validatedUser: User) => {
                await this.userRepository.updateById(userId, validatedUser)
                return this.one(request, response, next)
            })
            .catch((error) => this.processRepositoryOrDbError(error.message, 400, userId, modifiedUser.username))
    }

    public async remove(request: Request, response: Response, next: NextFunction) {
        const userId = request.params.id
        await this.userRepository.removeById(userId)
            .catch((error) => this.processRepositoryOrDbError(error.message, 404, userId))
        response.status(204).end()
    }

    /**
     * Processes any error thrown by the repository or even the DB.
     *
     * If the error is something like "Cannot find",
     * wich means that provided ID doesn't exist, it will customize the error.
     *
     * If the error is something like "UNIQUE...username", wich is a DB constraint,
     * it will customize the error with the already existing one.
     *
     * Otherwise, it will throw the error "as is"
     * @param message the raw error mesasge
     * @param status the http status code
     * @param userId the user's ID (can be undefined if username provided)
     * @param username the username (optional)
     */
    private processRepositoryOrDbError(message: string, status: number, userId: number, username?: string) {
        if (message.match(/.*Cannot find.*/i))
            message = message
                .replace("entity", "user")
                .replace(/ a.*id/, ` the given id: ${userId}`)
        else if (message.match(/.*UNIQUE.*username.*/i))
            message = `Username ${username} already taken`
        throw { message, status }
    }
}

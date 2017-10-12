import { transformAndValidate } from "class-transformer-validator"
import { NextFunction, Request, Response } from "express"
import * as HttpStatus from "http-status-codes"
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
        else
            this.processRepositoryOrDbError(
                new Error("Cannot find entity by a given id"),
                HttpStatus.BAD_REQUEST,
                userId)
    }

    public async save(request: Request, response: Response, next: NextFunction) {
        const newUser = request.body
        if (Object.keys(newUser).length === 0 && newUser.constructor === Object)
            response.status(HttpStatus.BAD_REQUEST).send({ message: "Empty user data" })
        console.log("Intento transformar")
        return transformAndValidate(User, newUser, { validator: { validationError: { target: false } } })
            .then(async (validatedUser: User) => {
                const savedUser = await this.userRepository.save(validatedUser)
                response.status(HttpStatus.CREATED)
                response.location(`${request.protocol}://${request.get("host")}${request.originalUrl}/${savedUser.id}`)
                return savedUser
            })
            .catch((error) =>
                this.processRepositoryOrDbError(error, HttpStatus.BAD_REQUEST, undefined, newUser.username))
    }

    public async update(request: Request, response: Response, next: NextFunction) {
        const userId = request.params.id;
        const modifiedUser = request.body
        if (Object.keys(modifiedUser).length === 0 && modifiedUser.constructor === Object)
            response.status(HttpStatus.BAD_REQUEST).send({ message: "Empty user data" })
        return transformAndValidate(User, modifiedUser, { validator: { validationError: { target: false } } })
            .then(async (validatedUser: User) => {
                await this.userRepository.updateById(userId, validatedUser)
                return this.one(request, response, next)
            })
            .catch((error) =>
                this.processRepositoryOrDbError(error, HttpStatus.BAD_REQUEST, userId, modifiedUser.username))
    }

    public async remove(request: Request, response: Response, next: NextFunction) {
        const userId = request.params.id
        await this.userRepository.removeById(userId)
            .catch((error) => this.processRepositoryOrDbError(error, HttpStatus.NOT_FOUND, userId))
        response.status(HttpStatus.NO_CONTENT).end()
    }

    public async posts(request: Request, response: Response, next: NextFunction) {
        const userId: number = request.params.id as number;
        const user = await this.userRepository.findOneById(userId, { relations: ["posts"] })
        if (user) return user.posts
        else
        this.processRepositoryOrDbError(
            new Error("Cannot find entity by a given id"),
            HttpStatus.BAD_REQUEST,
            userId)
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
     * @param message the raw error message
     * @param status the http status code
     * @param userId the user's ID (can be undefined if username provided)
     * @param username the username (optional)
     */
    private processRepositoryOrDbError(error: Error, status: number, userId: number, username?: string) {
        if (error.message) {
            let message = error.message
            console.log("Proceso error " + message + "; status=" + status)
            if (message.match(/.*Cannot find.*/i))
                message = message
                    .replace("entity", "user")
                    .replace(/ a.*id/, ` the given id: ${userId}`)
            else if (message.match(/.*UNIQUE.*username.*/i))
                message = `Username ${username} already taken`
            else if (message === "Cannot read property 'match' of undefined")
                message = "Unable to parse the request body"
            throw { message, status }
        }
        throw { message: error, status }
    }
}

"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt = require("bcrypt");
const class_transformer_validator_1 = require("class-transformer-validator");
const HttpStatus = require("http-status-codes");
const jwt = require("jwt-simple");
const typeorm_1 = require("typeorm");
const Post_1 = require("../entity/Post");
const User_1 = require("../entity/User");
const PostHalUtils_1 = require("../hateoas/PostHalUtils");
const UserHalUtils_1 = require("../hateoas/UserHalUtils");
class UserController {
    constructor() {
        this.userRepository = typeorm_1.getRepository(User_1.User);
        this.postRepository = typeorm_1.getRepository(Post_1.Post);
    }
    getCurrentUser(request, response, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const authorizationHeader = request.get("Authorization");
            if (!authorizationHeader) {
                this.processError(new Error("Authorization header must be provided"), HttpStatus.UNAUTHORIZED, undefined);
            }
            const authorizationParts = authorizationHeader.split(" ");
            if (authorizationParts.length !== 2 || authorizationParts[0] !== "Bearer") {
                this.processError(new Error("Malformed Authorization header (must be 'Bearer' + token)"), HttpStatus.UNPROCESSABLE_ENTITY, undefined);
            }
            try {
                const decodedUser = jwt.decode(authorizationParts[1], UserController.secret);
                return this.userRepository.findOneById(decodedUser.id)
                    .then((foundUser) => {
                    if (!foundUser) {
                        this.processError(new Error("Token's user not found (it may have been deleted)"), HttpStatus.NOT_FOUND, undefined);
                    }
                    return foundUser;
                })
                    .catch((error) => this.processError(new Error("Invalid token. User may have been deleted"), HttpStatus.UNAUTHORIZED, undefined));
            }
            catch (_a) {
                this.processError(new Error("Unable to parse token"), HttpStatus.UNPROCESSABLE_ENTITY, undefined);
            }
        });
    }
    login(request, response, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const username = request.body.username;
            const password = request.body.password;
            if (!username || !password) {
                return this.processError(new Error("Username and password must be provided"), HttpStatus.UNPROCESSABLE_ENTITY, undefined);
            }
            const user = new User_1.User();
            user.username = username;
            const foundUser = yield this.userRepository.findOne({ where: user });
            if (!foundUser || !(yield bcrypt.compare(password, foundUser.password))) {
                return this.processError(new Error("Invalid credentials"), HttpStatus.UNAUTHORIZED, undefined);
            }
            return { token: jwt.encode(foundUser, UserController.secret) };
        });
    }
    all(request, response, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const skip = Number(request.query.start);
            const take = Number(request.query.size);
            if (isNaN(skip) || isNaN(take)) {
                this.processError(new Error("Lists must be paginated with start=<num>&size=<num> query params (use 0 to list all)"), HttpStatus.BAD_REQUEST);
            }
            const users = yield this.userRepository.findAndCount({ skip, take });
            return UserHalUtils_1.default.getUsersWithNavigationLinks(users, request.path, skip, take);
        });
    }
    one(request, response, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const userId = request.params.id;
            const user = yield this.userRepository.findOneById(userId);
            if (!user)
                this.processError(new Error("Cannot find entity by a given id"), HttpStatus.NOT_FOUND, userId);
            return UserHalUtils_1.default.getUserWithActionLinks(user);
        });
    }
    save(request, response, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const newUser = request.body;
            if (Object.keys(newUser).length === 0 && newUser.constructor === Object) {
                this.processError(new Error("Empty user data"), HttpStatus.UNPROCESSABLE_ENTITY, undefined);
            }
            return class_transformer_validator_1.transformAndValidate(User_1.User, newUser, { validator: { validationError: { target: false } } })
                .then((validatedUser) => __awaiter(this, void 0, void 0, function* () {
                validatedUser.password = yield bcrypt.hash(validatedUser.password, 2);
                const savedUser = yield this.userRepository.save(validatedUser);
                response.status(HttpStatus.CREATED);
                response.location(`${request.protocol}://${request.get("host")}${request.path}/${savedUser.id}`);
                return UserHalUtils_1.default.getUserWithActionLinks(savedUser);
            }))
                .catch((error) => this.processError(error, HttpStatus.UNPROCESSABLE_ENTITY, undefined, newUser.username));
        });
    }
    update(request, response, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const userId = request.params.id;
            const modifiedUser = request.body;
            if (Object.keys(modifiedUser).length === 0 && modifiedUser.constructor === Object) {
                response.status(HttpStatus.UNPROCESSABLE_ENTITY).send({ message: "Empty user data" });
            }
            return class_transformer_validator_1.transformAndValidate(User_1.User, modifiedUser, { validator: { validationError: { target: false } } })
                .then((validatedUser) => __awaiter(this, void 0, void 0, function* () {
                yield this.userRepository.updateById(userId, validatedUser);
                response.status(HttpStatus.CREATED);
                return UserHalUtils_1.default.getUserWithActionLinks(yield this.userRepository.findOneById(userId));
            }))
                .catch((error) => this.processError(error, HttpStatus.UNPROCESSABLE_ENTITY, userId, modifiedUser.username));
        });
    }
    remove(request, response, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const userId = request.params.id;
            yield this.userRepository.removeById(userId)
                .catch((error) => this.processError(error, HttpStatus.NOT_FOUND, userId));
            response.status(HttpStatus.NO_CONTENT).end();
        });
    }
    posts(request, response, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const skip = Number(request.query.start);
            const take = Number(request.query.size);
            if (isNaN(skip) || isNaN(take)) {
                this.processError(new Error("Lists must be paginated with start=<num>&size=<num> query params (use 0 to list all)"), HttpStatus.BAD_REQUEST);
            }
            const userId = request.params.id;
            const user = yield this.userRepository.findOneById(userId);
            if (!user)
                this.processError(new Error("Cannot find entity by a given id"), HttpStatus.BAD_REQUEST, userId);
            const selectQueryBuilder = yield this.postRepository
                .createQueryBuilder("post")
                .leftJoinAndSelect("post.user", "user")
                .where(`user.id == ${userId}`);
            const posts = yield selectQueryBuilder.skip(skip).take(take).getMany();
            const postCount = yield selectQueryBuilder.getCount();
            return PostHalUtils_1.default.getPostsWithNavigationLinks([posts, postCount], request.path, skip, take);
        });
    }
    post(request, response, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const userId = Number(request.params.userId);
            const postId = Number(request.params.postId);
            const user = yield this.userRepository.findOneById(userId);
            if (!user)
                this.processError(new Error("Cannot find entity by a given id"), HttpStatus.BAD_REQUEST, userId);
            const post = yield this.postRepository.findOneById(postId);
            if (!post)
                this.processError(new Error("Cannot find post by a given id"), HttpStatus.BAD_REQUEST, postId);
            if (!(yield this.checkPostBelongToUser(userId, postId))) {
                this.processError(new Error(`This post doesn't belong to this user`), HttpStatus.NOT_FOUND);
            }
            return PostHalUtils_1.default.getPostWithActionLinks(post);
        });
    }
    checkPostBelongToUser(userId, postId) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.postRepository
                .createQueryBuilder("post")
                .leftJoinAndSelect("post.user", "user")
                .where(`user.id == ${userId}`)
                .andWhere(`post.id == ${postId}`)
                .getCount()) === 1;
        });
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
     * @param error the error to process
     * @param status the http status code
     * @param userId the user's ID (can be undefined if username provided)
     * @param username the username (optional)
     */
    processError(error, status, userId, username) {
        if (!error.message)
            throw { message: error, status };
        let message = error.message;
        if (message.match(/.*Cannot find.*/i)) {
            status = HttpStatus.NOT_FOUND;
            message = message
                .replace("entity", "user")
                .replace(/ a.*id/, ` the given id: ${userId}`);
        }
        else if (message.match(/.*UNIQUE.*username.*/i)) {
            message = `Username ${username} already taken`;
        }
        throw { message, status };
    }
}
UserController.secret = "putopavel123"; // JWT Secret
exports.UserController = UserController;
//# sourceMappingURL=UserController.js.map
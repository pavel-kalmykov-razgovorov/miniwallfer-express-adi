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
const class_transformer_validator_1 = require("class-transformer-validator");
const HttpStatus = require("http-status-codes");
const typeorm_1 = require("typeorm");
const Post_1 = require("../entity/Post");
const User_1 = require("../entity/User");
const PostHalUtils_1 = require("../hateoas/PostHalUtils");
const UserController_1 = require("./UserController");
class PostController {
    constructor() {
        this.userController = new UserController_1.UserController();
        this.postRepository = typeorm_1.getRepository(Post_1.Post);
    }
    all(request, response, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const skip = Number(request.query.start);
            const take = Number(request.query.size);
            if (isNaN(skip) || isNaN(take)) {
                this.processError(new Error("Lists must be paginated with start=<num>&size=<num> query params (use 0 to list all)"), HttpStatus.BAD_REQUEST);
            }
            const postsAndCount = yield this.postRepository.findAndCount({ skip, take });
            return PostHalUtils_1.default.getPostsWithNavigationLinks(postsAndCount, request.path, skip, take);
        });
    }
    one(request, response, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const postId = request.params.id;
            this.checkPostsId(postId);
            const post = yield this.postRepository.findOneById(postId);
            if (!post)
                this.processError(new Error("Cannot find entity by a given id"), HttpStatus.NOT_FOUND, postId);
            return PostHalUtils_1.default.getPostWithActionLinks(post);
        });
    }
    save(request, response, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const userId = request.params.id;
            const newPost = request.body;
            this.checkUsersId(userId);
            yield this.checkUserPermissions(request, response, next, userId);
            if (Post_1.Post.isEmpty(newPost)) {
                this.processError(new Error("Empty user data"), HttpStatus.UNPROCESSABLE_ENTITY);
            }
            return class_transformer_validator_1.transformAndValidate(Post_1.Post, newPost, { validator: { validationError: { target: false } } })
                .then((validatedPost) => __awaiter(this, void 0, void 0, function* () {
                validatedPost.user = new User_1.User();
                validatedPost.user.id = userId;
                const savedPost = yield this.postRepository.save(validatedPost);
                response.status(HttpStatus.CREATED);
                response.location(`${request.protocol}://${request.get("host")}${request.url}/${savedPost.id}`);
                return PostHalUtils_1.default.getPostWithActionLinks(savedPost);
            }))
                .catch((error) => this.processError(error, HttpStatus.UNPROCESSABLE_ENTITY, undefined, userId));
        });
    }
    update(request, response, next) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.checkUsersAndPostsIds(request, response, next);
            const userId = request.params.userId;
            const postId = request.params.postId;
            const modifiedPost = request.body;
            if (Post_1.Post.isEmpty(modifiedPost))
                this.processError(new Error("Empty post data"), HttpStatus.UNPROCESSABLE_ENTITY);
            return class_transformer_validator_1.transformAndValidate(Post_1.Post, modifiedPost, { validator: { validationError: { target: false } } })
                .then((validatedPost) => __awaiter(this, void 0, void 0, function* () {
                yield this.postRepository.updateById(postId, validatedPost);
                response.status(HttpStatus.CREATED);
                return PostHalUtils_1.default.getPostWithActionLinks(yield this.postRepository.findOneById(postId));
            }))
                .catch((error) => this.processError(error, HttpStatus.UNPROCESSABLE_ENTITY, postId, modifiedPost.user.id));
        });
    }
    remove(request, response, next) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.checkUsersAndPostsIds(request, response, next);
            const userId = request.params.userId;
            const postId = request.params.postId;
            yield this.postRepository.removeById(postId)
                .catch((error) => this.processError(error, HttpStatus.NOT_FOUND, postId));
            response.status(HttpStatus.NO_CONTENT).end();
        });
    }
    checkUsersAndPostsIds(request, response, next) {
        return __awaiter(this, void 0, void 0, function* () {
            const postId = request.params.postId;
            const userId = request.params.userId;
            this.checkPostsId(postId);
            this.checkUsersId(userId);
            yield this.checkUserPermissions(request, response, next, userId);
        });
    }
    checkUserPermissions(request, response, next, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.userController.getCurrentUser(request, response, next);
            if (user.id !== Number(userId)) {
                this.processError(new Error("Trying to access someone else's resources"), HttpStatus.UNAUTHORIZED);
            }
        });
    }
    checkUsersId(userId) {
        if (!userId || isNaN(userId)) {
            this.processError(new Error("User's ID not present in URL"), HttpStatus.BAD_REQUEST);
        }
    }
    checkPostsId(postId) {
        if (!postId || isNaN(postId)) {
            this.processError(new Error("Post's ID not present in URL"), HttpStatus.BAD_REQUEST);
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
    processError(error, status, postId, userId) {
        if (!error.message)
            throw { message: error, status };
        let message = error.message;
        if (message.match(/.*Cannot find.*/i)) {
            status = HttpStatus.NOT_FOUND;
            message = message
                .replace("entity", "post")
                .replace(/ a.*id/, ` the given id: ${postId}`);
        }
        else if (message.match(/.*FOREIGN KEY.*/i))
            message = `Username with ID ${userId} doesn't exist`;
        throw { message, status };
    }
}
exports.PostController = PostController;
//# sourceMappingURL=PostController.js.map
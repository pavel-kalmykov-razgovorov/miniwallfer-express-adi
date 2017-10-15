"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const class_transformer_1 = require("class-transformer");
const CommonHalUtils_1 = require("./CommonHalUtils");
const UserHalUtils_1 = require("./UserHalUtils");
class PostHalUtils {
    static getPostsWithNavigationLinks(postsAndCount, url, skip, take) {
        postsAndCount[0].forEach((post) => post.user = UserHalUtils_1.default.getUserWithActionLinks(post.user));
        const halPosts = CommonHalUtils_1.default.insertObjectToEmbeddedKey(class_transformer_1.classToPlain(postsAndCount[0]));
        CommonHalUtils_1.default.addNavigationLinks(halPosts, url, skip, take, postsAndCount[1]);
        return halPosts;
    }
    static getPostWithActionLinks(post) {
        const userAbsoluteUrl = `/users/${post.user.id}`;
        const postAbsoluteUrl = `${userAbsoluteUrl}/posts/${post.id}`;
        post.user = UserHalUtils_1.default.getUserWithActionLinks(post.user);
        const halPost = CommonHalUtils_1.default.insertObjectToEmbeddedKey(class_transformer_1.classToPlain(post));
        CommonHalUtils_1.default.addLink(halPost, "self", postAbsoluteUrl);
        CommonHalUtils_1.default.addLink(halPost, "user", userAbsoluteUrl);
        return halPost;
    }
}
exports.default = PostHalUtils;
//# sourceMappingURL=PostHalUtils.js.map
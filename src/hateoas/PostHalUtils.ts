import { classToPlain } from "class-transformer";
import { Post } from "../entity/Post";
import { User } from "../entity/User";
import CommonHalUtils from "./CommonHalUtils";
import UserHalUtils from "./UserHalUtils";

export default class PostHalUtils {
    public static getPostsWithNavigationLinks(
        postsAndCount: [Post[], number],
        url: string,
        skip: number,
        take: number): object {
        postsAndCount[0].forEach((post) => post.user = UserHalUtils.getUserWithActionLinks(post.user) as User)
        const halPosts = CommonHalUtils.insertObjectToEmbeddedKey(classToPlain(postsAndCount[0]))
        CommonHalUtils.addNavigationLinks(halPosts, url, skip, take, postsAndCount[1])
        return halPosts
    }

    public static getPostWithActionLinks(post: Post): object {
        const userAbsoluteUrl = `/users/${post.user.id}`
        const postAbsoluteUrl = `${userAbsoluteUrl}/posts/${post.id}`
        post.user = UserHalUtils.getUserWithActionLinks(post.user) as User
        const halPost = CommonHalUtils.insertObjectToEmbeddedKey(classToPlain(post))
        CommonHalUtils.addLink(halPost, "self", postAbsoluteUrl)
        CommonHalUtils.addLink(halPost, "user", userAbsoluteUrl)
        return halPost
    }
}

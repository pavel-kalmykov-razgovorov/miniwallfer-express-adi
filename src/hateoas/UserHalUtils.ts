import { classToPlain } from "class-transformer";
import { User } from "../entity/User";
import CommonHalUtils from "./CommonHalUtils";

export default class UserHalUtils {
    public static getUsersWithNavigationLinks(
        usersAndCount: [User[], number],
        url: string,
        skip: number,
        take: number): object {
        const halUsers = CommonHalUtils.insertObjectToEmbeddedKey(classToPlain(usersAndCount[0]))
        CommonHalUtils.addNavigationLinks(halUsers, url, skip, take, usersAndCount[1])
        return halUsers
    }

    public static getUserWithActionLinks(user: User): object {
        const userAbsoluteUrl = `/users/${user.id}`
        const halUser = CommonHalUtils.insertObjectToEmbeddedKey(classToPlain(user))
        CommonHalUtils.addLink(halUser, "self", userAbsoluteUrl)
        CommonHalUtils.addLink(halUser, "posts", `${userAbsoluteUrl}/posts?start=&size=`, true)
        return halUser
    }
}

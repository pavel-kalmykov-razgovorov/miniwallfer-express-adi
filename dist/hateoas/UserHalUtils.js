"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const class_transformer_1 = require("class-transformer");
const CommonHalUtils_1 = require("./CommonHalUtils");
class UserHalUtils {
    static getUsersWithNavigationLinks(usersAndCount, url, skip, take) {
        const halUsers = CommonHalUtils_1.default.insertObjectToEmbeddedKey(class_transformer_1.classToPlain(usersAndCount[0]));
        CommonHalUtils_1.default.addNavigationLinks(halUsers, url, skip, take, usersAndCount[1]);
        return halUsers;
    }
    static getUserWithActionLinks(user) {
        const userAbsoluteUrl = `/users/${user.id}`;
        const halUser = CommonHalUtils_1.default.insertObjectToEmbeddedKey(class_transformer_1.classToPlain(user));
        CommonHalUtils_1.default.addLink(halUser, "self", userAbsoluteUrl);
        CommonHalUtils_1.default.addLink(halUser, "posts", `${userAbsoluteUrl}/posts?start=&size=`, true);
        return halUser;
    }
}
exports.default = UserHalUtils;
//# sourceMappingURL=UserHalUtils.js.map
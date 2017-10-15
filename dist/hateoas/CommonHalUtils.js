"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class CommonHalUtils {
    static insertObjectToEmbeddedKey(object) {
        if (!object.hasOwnProperty("_embedded")) {
            let links = {};
            if (object.hasOwnProperty("_links")) {
                links = object._links;
                object._links = undefined;
            }
            const embedded = object;
            object = { _embedded: embedded, _links: links };
        }
        return object;
    }
    static addNavigationLinks(object, url, skip, take, entityCount) {
        CommonHalUtils.addLink(object, "self", `${url}?start=${skip}&size=${take}`);
        CommonHalUtils.addLink(object, "first", `${url}?start=0&size=${take}`);
        CommonHalUtils.addLink(object, "prev", `${url}?start=${Math.max(skip - take, 0)}&size=${take}`);
        CommonHalUtils.addLink(object, "next", `${url}?start=${skip + take}&size=${take}`);
        CommonHalUtils.addLink(object, "last", `${url}?start=${entityCount - take}&size=${take}`);
        CommonHalUtils.addLink(object, "one", `/:id`, true);
    }
    static addLink(object, name, href, templated) {
        if (!object.hasOwnProperty("_links"))
            object._links = {};
        object._links[name] = { href };
        if (templated)
            object._links[name].templated = templated;
    }
}
exports.default = CommonHalUtils;
//# sourceMappingURL=CommonHalUtils.js.map
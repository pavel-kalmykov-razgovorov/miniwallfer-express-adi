export default class CommonHalUtils {
    public static insertObjectToEmbeddedKey(object: any) {
        if (!object.hasOwnProperty("_embedded")) {
            let links = {}
            if (object.hasOwnProperty("_links")) {
                links = object._links
                object._links = undefined
            }
            const embedded = object
            object = { _embedded: embedded, _links: links }
        }
        return object
    }

    public static addNavigationLinks(object: any, url: string, skip: number, take: number, entityCount: number) {
        CommonHalUtils.addLink(object, "self", `${url}?start=${skip}&size=${take}`)
        CommonHalUtils.addLink(object, "first", `${url}?start=0&size=${take}`)
        CommonHalUtils.addLink(object, "prev", `${url}?start=${Math.max(skip - take, 0)}&size=${take}`)
        CommonHalUtils.addLink(object, "next", `${url}?start=${skip + take}&size=${take}`)
        CommonHalUtils.addLink(object, "last", `${url}?start=${entityCount - take}&size=${take}`)
        CommonHalUtils.addLink(object, "one", `/:id`, true)
    }

    public static addLink(object: any, name: string, href: string, templated?: boolean) {
        if (!object.hasOwnProperty("_links")) object._links = {}
        object._links[name] = { href }
        if (templated) object._links[name].templated = templated
    }
}

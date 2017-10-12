import { PostController } from "./controller/PostController"
import { UserController } from "./controller/UserController"

export const Routes = [{
    action: "all",
    controller: UserController,
    method: "get",
    route: "/users",
}, {
    action: "one",
    controller: UserController,
    method: "get",
    route: "/users/:id",
}, {
    action: "save",
    controller: UserController,
    method: "post",
    route: "/users",
}, {
    action: "update",
    controller: UserController,
    method: "put",
    route: "/users/:id",
}, {
    action: "remove",
    controller: UserController,
    method: "delete",
    route: "/users/:id",
}, {
    action: "all",
    controller: PostController,
    method: "get",
    route: "/posts",
}, {
    action: "one",
    controller: PostController,
    method: "get",
    route: "/posts/:id",
}, {
    action: "save",
    controller: PostController,
    method: "post",
    route: "/posts",
}, {
    action: "update",
    controller: PostController,
    method: "put",
    route: "/posts/:id",
}, {
    action: "remove",
    controller: PostController,
    method: "delete",
    route: "/posts/:id",
}]

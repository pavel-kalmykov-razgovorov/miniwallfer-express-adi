import * as assert from "assert"
import * as SpinnerModule from "cli-spinner"
import * as faker from "faker/locale/es"
import "reflect-metadata"
import { createConnection, getRepository } from "typeorm"
import * as util from "util"
import * as yargs from "yargs"
import { Post } from "./src/entity/Post"
import { User } from "./src/entity/User"
const Spinner = SpinnerModule.Spinner

yargs.usage(`Usage: $0
--seed [num]
--users [num]
--min-user-posts [num]
--max-user-posts [num]
--min-word [num]
--max-words [num]`)
    .demandOption(["seed", "users", "min-user-posts", "max-user-posts", "min-words", "max-words"])
const argv = yargs.argv
createConnection().then(async (connection) => {
    const userRepository = getRepository(User)
    const postRepository = getRepository(Post)

    const seed = Number(argv.seed)
    const users = Number(argv.users)
    const minUserPosts = Number(argv.minUserPosts)
    const maxUserPosts = Number(argv.maxUserPosts)
    const minWords = Number(argv.minWords)
    const maxWords = Number(argv.maxWords)
    if (Array(seed, users, minUserPosts, maxUserPosts, minWords, maxWords).some((value) => isNaN(value))) {
        console.log("Error: All arguments must be numeric")
        process.exit(1)
    }

    faker.seed(seed)
    Array.from(Array(users)).forEach(async (i) => {
        const user = new User()
        user.firstName = faker.name.firstName()
        user.lastName = faker.name.lastName()
        user.username = faker.internet.userName(user.firstName, user.lastName)
        user.password = faker.internet.password(10, true)
        user.birthdate = faker.date.between(new Date(2005, 12, 31), new Date(1950, 1, 1))
        await userRepository.save(user)
            .then((savedUser) => {
                Array.from(Array(faker.random.number({ min: minUserPosts, max: maxUserPosts }))).forEach(async (j) => {
                    const post = new Post()
                    post.text = faker.random.words(faker.random.number({ min: minWords, max: maxWords }))
                    post.user = savedUser
                    try {
                        await postRepository.save(post)
                    } catch (error) {
                        console.log(`Unable to save post ${util.inspect(post)} because ${error.message}`)
                    }
                })
            })
            .catch((err) => console.log(`Unable to save user ${util.inspect(user)} because ${err.message}`))
    })
}).catch((error) => console.log(error))

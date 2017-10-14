import { Type } from "class-transformer";
import { IsDate, IsNotEmpty, Matches } from "class-validator"
import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm"
import { User } from "./User"

@Entity()
export class Post {

    /**
     * checks wether the object contains any key or not
     */
    public static isEmpty(post: Post) {
        return Object.keys(post).length === 0 && post.constructor === Object
    }

    @PrimaryGeneratedColumn()
    public id: number

    @Column("text")
    @IsNotEmpty()
    public text: string

    @ManyToOne((type) => User, (user: User) => user.posts, { eager: true, onDelete: "CASCADE", nullable: false })
    @Type(() => User)
    public user: User;
}

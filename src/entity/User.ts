import { Type } from "class-transformer";
import { IsDate, IsNotEmpty, Matches } from "class-validator"
import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from "typeorm"
import { Post } from "./Post"

@Entity()
export class User {

    @PrimaryGeneratedColumn()
    public id: number

    @Column({ unique: true })
    @Index()
    @IsNotEmpty()
    @Matches(/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){8,20}$/i, {
        message: "Username must be a valid string",
    })
    public username: string

    @Column()
    @IsNotEmpty()
    @Matches(/^[a-zA-ZÀ-ž]+(([',. -][a-zA-ZÀ-ž ])?[a-zA-ZÀ-ž]*)*$/, {
        message: "First name must be a valid name (no numbers, no special characters)",
    })
    public firstName: string

    @Column()
    @IsNotEmpty()
    @Matches(/^[a-zA-ZÀ-ž]+(([',. -][a-zA-ZÀ-ž ])?[a-zA-ZÀ-ž]*)*$/, {
        message: "Last name must be a valid name (no numbers, no special characters)",
    })
    public lastName: string

    @Column()
    @IsNotEmpty()
    @IsDate()
    @Type(() => Date)
    public birthdate: Date

    @OneToMany((type) => Post, (post: Post) => post.user)
    public posts: Post[]
}

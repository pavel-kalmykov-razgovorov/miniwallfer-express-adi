import { Type } from "class-transformer";
import { IsDate, IsNotEmpty, Matches } from "class-validator"
import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm"
import { User } from "./User"

@Entity()
export class Post {
    @PrimaryGeneratedColumn()
    public id: number

    @Column("text")
    @IsNotEmpty()
    public text: string

    @ManyToOne((type) => User, (user: User) => user.posts, { eager: true, onDelete: "CASCADE", nullable: false })
    @Type(() => User)
    public user: User;
}

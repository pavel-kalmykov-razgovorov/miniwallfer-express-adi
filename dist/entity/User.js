"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const typeorm_1 = require("typeorm");
const Post_1 = require("./Post");
let User = class User {
    /**
     * checks wether the object contains any key or not
     */
    static isEmpty(user) {
        return Object.keys(user).length === 0 && user.constructor === Object;
    }
};
__decorate([
    typeorm_1.PrimaryGeneratedColumn(),
    __metadata("design:type", Number)
], User.prototype, "id", void 0);
__decorate([
    typeorm_1.Column({ unique: true }),
    typeorm_1.Index(),
    class_validator_1.IsNotEmpty(),
    class_validator_1.Matches(/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){8,20}$/i, {
        message: "Username must be a valid string",
    }),
    __metadata("design:type", String)
], User.prototype, "username", void 0);
__decorate([
    typeorm_1.Column(),
    class_validator_1.IsNotEmpty(),
    class_validator_1.Length(8, 20),
    class_transformer_1.Exclude({ toPlainOnly: true }),
    __metadata("design:type", String)
], User.prototype, "password", void 0);
__decorate([
    typeorm_1.Column(),
    class_validator_1.IsNotEmpty(),
    class_validator_1.Matches(/^[a-zA-ZÀ-ž]+(([',. -][a-zA-ZÀ-ž ])?[a-zA-ZÀ-ž]*)*$/, {
        message: "First name must be a valid name (no numbers, no special characters)",
    }),
    __metadata("design:type", String)
], User.prototype, "firstName", void 0);
__decorate([
    typeorm_1.Column(),
    class_validator_1.IsNotEmpty(),
    class_validator_1.Matches(/^[a-zA-ZÀ-ž]+(([',. -][a-zA-ZÀ-ž ])?[a-zA-ZÀ-ž]*)*$/, {
        message: "Last name must be a valid name (no numbers, no special characters)",
    }),
    __metadata("design:type", String)
], User.prototype, "lastName", void 0);
__decorate([
    typeorm_1.Column(),
    class_validator_1.IsNotEmpty(),
    class_validator_1.IsDate(),
    class_transformer_1.Type(() => Date),
    __metadata("design:type", Date)
], User.prototype, "birthdate", void 0);
__decorate([
    typeorm_1.OneToMany((type) => Post_1.Post, (post) => post.user),
    __metadata("design:type", Array)
], User.prototype, "posts", void 0);
User = __decorate([
    typeorm_1.Entity()
], User);
exports.User = User;
//# sourceMappingURL=User.js.map
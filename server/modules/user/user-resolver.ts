import "reflect-metadata";
import { ObjectID } from "mongodb";
import { Context } from "../context.type";
import { ApolloError } from "apollo-server-express";
import {
  Arg,
  Args,
  Authorized,
  Ctx,
  Mutation,
  Query,
  Resolver,
  UseMiddleware,
} from "type-graphql";

import Me from "../../entities/Me";
import Member from "../../entities/Member";
import RateLimit from "../rate-limiter-middleware";
import UserModel, { User } from "../../entities/User";
import { setColorArgs, setUserLinksArgs } from "./user.inputs";

@Resolver(of => User)
class UserResolver {
  @Authorized()
  @Query(() => Me)
  me(@Ctx() context: Context): Me {
    return context.getUser();
  }

  @Authorized()
  @Query(() => [Member])
  async listUsers(@Ctx() context: Context): Promise<Member[]> {
    try {
      const users = await UserModel.find({
        _id: { $ne: context.currentUser.id },
      });
      return users;
    } catch (err) {
      throw new ApolloError(err);
    }
  }

  @Authorized()
  @Query(() => User)
  async getUser(@Arg("id", { nullable: false }) id: ObjectID): Promise<User> {
    try {
      const user = await UserModel.findOne({ _id: id }).populate("rooms");
      if (!user) throw new ApolloError(`User not found with id ${id}`);
      return user;
    } catch (err) {
      throw new ApolloError(err);
    }
  }

  @Authorized()
  @UseMiddleware(RateLimit({ limit: 500 }))
  @Mutation(returns => Member)
  async setColor(@Args() { color }: setColorArgs, @Ctx() context: Context) {
    try {
      const user = await UserModel.findOneAndUpdate(
        { _id: context.currentUser.id },
        { color: color },
        { new: true }
      );
      if (!user) throw new ApolloError("User not found with id");
      return user;
    } catch (err) {
      throw new ApolloError(err);
    }
  }

  @Authorized()
  @UseMiddleware(RateLimit({ limit: 500 }))
  @Mutation(returns => Member)
  async setUserLinks(@Args() links: setUserLinksArgs, @Ctx() context: Context) {
    try {
      const foundUser = await UserModel.findOne({
        _id: context.currentUser.id,
      });
      if (!foundUser) throw new ApolloError("User not found with id");

      const linksToBeUpdated = { ...foundUser.toObject().links, ...links };

      const user = await UserModel.findOneAndUpdate(
        { _id: context.currentUser.id },
        {
          $set: { links: linksToBeUpdated },
        },
        { new: true }
      );
      return user;
    } catch (err) {
      throw new ApolloError(err);
    }
  }

  @Authorized()
  @Mutation(returns => Boolean)
  logout(@Ctx() context: Context) {
    const { req } = context;
    req.logout();
    return true;
  }
}

export default UserResolver;

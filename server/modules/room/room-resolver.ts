import "reflect-metadata";
import { ObjectID } from "mongodb";
import { Context } from "../context.type";
import { ApolloError } from "apollo-server-express";
import {
  Resolver,
  Query,
  Ctx,
  Arg,
  Authorized,
  Mutation,
  Args,
  UseMiddleware,
} from "type-graphql";

import UserModel from "../../entities/User";
import RoomModel, { Room } from "../../entities/Room";
import { createRoomArgs, removeMembersArgs } from "./room-inputs";
import Member from "../../entities/Member";
import RateLimit from "../rate-limiter-middleware";

@Resolver(of => Room)
class RoomResolver {
  @Authorized()
  @Query(() => [Room])
  async listRooms(): Promise<Room[]> {
    try {
      const rooms = await RoomModel.find({})
        .populate("members")
        .populate({
          path: "messages",
          model: "message",
          populate: { path: "author", model: "user" },
        });

      return rooms;
    } catch (err) {
      throw new ApolloError(err);
    }
  }

  @Authorized()
  @Query(() => [Room])
  async listCurrentUserRooms(@Ctx() context: Context): Promise<Room[]> {
    try {
      const rooms = await RoomModel.find({ members: context.currentUser.id })
        .populate("members")
        .populate({
          path: "messages",
          model: "message",
          populate: { path: "author", model: "user" },
        });

      return rooms;
    } catch (err) {
      throw new ApolloError(err);
    }
  }

  @Authorized()
  @Query(() => Room)
  async getRoom(
    @Arg("id", { nullable: false }) id: ObjectID,
    @Ctx() context: Context
  ): Promise<Room> {
    try {
      const user = await RoomModel.findOne({
        _id: id,
        members: { $in: [context.currentUser] },
      })
        .populate("members")
        .populate({
          path: "messages",
          model: "message",
          populate: { path: "author", model: "user" },
        });

      if (!user) throw new ApolloError("Room not found with id");
      return user;
    } catch (err) {
      throw new ApolloError(err);
    }
  }

  @Authorized()
  @UseMiddleware(RateLimit({ limit: 20 }))
  @Mutation(() => Room)
  async createRoom(@Args() { name }: createRoomArgs, @Ctx() context: Context) {
    try {
      const room = new RoomModel({
        name: name,
        messages: [],
        members: [context.currentUser.id],
        owner: context.currentUser.id,
      });
      await room.populate("members").execPopulate();

      await UserModel.findByIdAndUpdate(
        context.currentUser.id,
        { $addToSet: { rooms: room._id } },
        { new: true }
      );
      const savedRoom = await room.save();

      return savedRoom;
    } catch (err) {
      throw new ApolloError(err);
    }
  }

  @Authorized()
  @Mutation(() => Room, { nullable: true })
  async deleteRoom(
    @Arg("roomId", { nullable: false }) roomId: ObjectID,
    @Ctx() context: Context
  ) {
    try {
      const room = await RoomModel.findOneAndDelete({
        _id: roomId,
        owner: context.currentUser.id,
      });

      await UserModel.update(
        { _id: context.currentUser.id },
        {
          $pull: { rooms: { _id: roomId } },
        },
        { new: true, multi: true }
      );

      return room;
    } catch (err) {
      throw new ApolloError(err);
    }
  }

  @Authorized()
  @UseMiddleware(RateLimit())
  @Mutation(() => Member, { nullable: true })
  async removeMemberFromRoom(
    @Args() { roomId, memberId }: removeMembersArgs,
    @Ctx() context: Context
  ): Promise<Member> {
    try {
      if (memberId.equals(context.currentUser.id)) {
        throw new ApolloError("You cannot not remove yourself from room");
      }

      const room = await RoomModel.findOneAndUpdate(
        {
          _id: roomId,
          owner: context.currentUser.id,
        },
        { $pull: { members: memberId } },
        { new: true }
      );

      const removedMember = await UserModel.findOneAndUpdate(
        { _id: memberId },
        { $pull: { rooms: roomId } },
        { new: true }
      );

      if (!removedMember || !room) {
        throw new ApolloError("Could not remove member from room");
      }

      return removedMember;
    } catch (err) {
      throw new ApolloError(err);
    }
  }
}

export default RoomResolver;

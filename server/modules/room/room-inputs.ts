import { ArgsType, Field } from "type-graphql";
import { Length } from "class-validator";
import { ObjectID } from "mongodb";

@ArgsType()
export class createRoomArgs {
  @Field({ nullable: false })
  @Length(2, 25)
  name: string;
}

@ArgsType()
export class removeMembersArgs {
  @Field(type => ObjectID, { nullable: false })
  roomId: ObjectID;

  @Field(type => ObjectID, { nullable: false })
  memberId: ObjectID;
}

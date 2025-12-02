import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  Default,
  BelongsTo,
  ForeignKey
} from "sequelize-typescript";
import Message from "./Message";

@Table({ timestamps: true })
class MessageReaction extends Model<MessageReaction> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Message)
  @Column
  messageId: string;

  @BelongsTo(() => Message, "messageId")
  message: Message;

  @Column(DataType.STRING(32))
  emoji: string;

  @Column(DataType.STRING)
  senderId: string;

  @Column(DataType.STRING)
  senderName: string;

  @Default(false)
  @Column
  fromMe: boolean;

  @CreatedAt
  @Column(DataType.DATE(6))
  createdAt: Date;

  @UpdatedAt
  @Column(DataType.DATE(6))
  updatedAt: Date;
}

export default MessageReaction;

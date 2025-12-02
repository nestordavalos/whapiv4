import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  DataType,
  PrimaryKey,
  Unique,
  Default,
  BelongsTo,
  ForeignKey,
  Index,
  BeforeCreate,
  BeforeUpdate,
  HasMany
} from "sequelize-typescript";
import Contact from "./Contact";
import Ticket from "./Ticket";
import MessageReaction from "./MessageReaction";

@Table({ timestamps: true })
class Message extends Model<Message> {
  @PrimaryKey
  @Unique
  @Column
  id: string;

  @Default(0)
  @Column
  ack: number;

  @Default(false)
  @Column
  read: boolean;

  @Default(false)
  @Column
  fromMe: boolean;

  @Column(DataType.STRING("long"))
  body: string;

  @Index
  @Column(DataType.STRING)
  bodySearch: string;

  @Column(DataType.STRING("long"))
  dataJson: string;

  @Column(DataType.STRING)
  participant: string;

  @Column(DataType.STRING)
  get mediaUrl(): string | null {
    if (this.getDataValue("mediaUrl")) {
      return `${process.env.BACKEND_URL}:${
        process.env.PROXY_PORT
      }/public/${this.getDataValue("mediaUrl")}`;
    }
    return null;
  }

  @Column
  mediaType: string;

  @Default(false)
  @Column
  isDeleted: boolean;

  @Default(false)
  @Column
  isEdited: boolean;

  @Index
  @CreatedAt
  @Column(DataType.DATE(6))
  createdAt: Date;

  @UpdatedAt
  @Column(DataType.DATE(6))
  updatedAt: Date;

  @ForeignKey(() => Message)
  @Column
  quotedMsgId: string;

  @BelongsTo(() => Message, "quotedMsgId")
  quotedMsg: Message;

  @Index
  @ForeignKey(() => Ticket)
  @Column
  ticketId: number;

  @BelongsTo(() => Ticket)
  ticket: Ticket;

  @Index
  @ForeignKey(() => Contact)
  @Column
  contactId: number;

  @BelongsTo(() => Contact, "contactId")
  contact: Contact;

  @HasMany(() => MessageReaction, "messageId")
  reactions: MessageReaction[];

  @BeforeCreate
  @BeforeUpdate
  static normalizeBody(instance: Message): void {
    if (instance.body) {
      instance.bodySearch = instance.body.toLowerCase().slice(0, 255);
    }
  }
}

export default Message;

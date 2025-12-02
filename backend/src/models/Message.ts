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
import { existsSync } from "fs";
import { join } from "path";
import Contact from "./Contact";
import Ticket from "./Ticket";
import MessageReaction from "./MessageReaction";
import getStorageConfig from "../config/storage";

// Helper to build S3 URL
const buildS3Url = (
  config: ReturnType<typeof getStorageConfig>,
  filename: string
): string => {
  const filePath = config.s3.prefix
    ? `${config.s3.prefix}/${filename}`
    : filename;

  if (config.s3.publicUrl) {
    return `${config.s3.publicUrl}/${filePath}`;
  }
  if (config.s3.endpoint) {
    // S3-compatible services
    return `${config.s3.endpoint}/${config.s3.bucket}/${filePath}`;
  }
  // Standard AWS S3
  return `https://${config.s3.bucket}.s3.${config.s3.region}.amazonaws.com/${filePath}`;
};

// Helper to build local URL
const buildLocalUrl = (filename: string): string => {
  return `${process.env.BACKEND_URL}:${process.env.PROXY_PORT}/public/${filename}`;
};

// Check if S3 credentials are configured
const hasS3Credentials = (
  config: ReturnType<typeof getStorageConfig>
): boolean => {
  return !!(
    config.s3.bucket &&
    config.s3.accessKeyId &&
    config.s3.secretAccessKey
  );
};

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
    const filename = this.getDataValue("mediaUrl");
    if (!filename) {
      return null;
    }

    const config = getStorageConfig();
    const localFilePath = join(__dirname, "..", "..", "public", filename);
    const fileExistsLocally = existsSync(localFilePath);
    const s3Configured = hasS3Credentials(config);

    // Priority logic:
    // 1. If file exists locally -> serve from local (faster, enables migration)
    // 2. If S3 is configured -> serve from S3
    // 3. Fallback to local URL

    // If file exists locally, always prefer local URL
    // This allows viewing files pending migration and is faster
    if (fileExistsLocally) {
      return buildLocalUrl(filename);
    }

    // File not local - try S3 if configured
    if (s3Configured) {
      return buildS3Url(config, filename);
    }

    // Default: return local URL (will 404 if file doesn't exist)
    return buildLocalUrl(filename);
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

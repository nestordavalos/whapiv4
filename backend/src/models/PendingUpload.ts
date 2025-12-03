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
  Index,
  Unique
} from "sequelize-typescript";

export type PendingUploadStatus =
  | "pending"
  | "syncing"
  | "completed"
  | "failed";

@Table({ tableName: "PendingUploads", timestamps: true })
class PendingUpload extends Model<PendingUpload> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Unique
  @Index
  @Column(DataType.STRING(500))
  filename: string;

  @Column(DataType.STRING(100))
  mimeType: string;

  @Column(DataType.BIGINT)
  size: number;

  @Default("pending")
  @Index
  @Column(DataType.ENUM("pending", "syncing", "completed", "failed"))
  status: PendingUploadStatus;

  @Default(0)
  @Column
  retryCount: number;

  @Column(DataType.STRING(1000))
  lastError: string;

  @Column(DataType.DATE)
  lastAttempt: Date;

  @CreatedAt
  @Column(DataType.DATE)
  createdAt: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updatedAt: Date;
}

export default PendingUpload;

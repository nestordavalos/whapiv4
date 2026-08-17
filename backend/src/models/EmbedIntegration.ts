import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  DataType,
  Default,
  ForeignKey,
  BelongsTo
} from "sequelize-typescript";
import User from "./User";

@Table({ tableName: "EmbedIntegrations" })
class EmbedIntegration extends Model<EmbedIntegration> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  publicId: string;

  @AllowNull(false)
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  secretVersion: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  name: string;

  @AllowNull(false)
  @Column(DataType.JSON)
  allowedOrigins: string[];

  @AllowNull(false)
  @Default("/tickets")
  @Column(DataType.STRING)
  defaultPath: string;

  @AllowNull(false)
  @Default(true)
  @Column(DataType.BOOLEAN)
  enabled: boolean;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column
  userId: number;

  @BelongsTo(() => User, "userId")
  user: User;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column
  createdBy: number;

  @Column(DataType.DATE)
  lastUsedAt: Date;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default EmbedIntegration;

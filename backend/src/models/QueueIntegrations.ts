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
  Default
} from "sequelize-typescript";

@Table({ tableName: "QueueIntegrations" })
class QueueIntegrations extends Model<QueueIntegrations> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Default("typebot")
  @Column(DataType.STRING)
  type: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  name: string;

  @Column(DataType.STRING)
  typebotUrl: string;

  @Column(DataType.STRING)
  typebotSlug: string;

  @Default(0)
  @Column(DataType.INTEGER)
  typebotExpires: number;

  @Column(DataType.STRING)
  typebotKeywordFinish: string;

  @Column(DataType.STRING)
  typebotKeywordRestart: string;

  @Column(DataType.STRING)
  typebotUnknownMessage: string;

  @Column(DataType.STRING)
  typebotRestartMessage: string;

  @Default(1000)
  @Column(DataType.INTEGER)
  typebotDelayMessage: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default QueueIntegrations;

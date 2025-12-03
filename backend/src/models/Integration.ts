import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey
} from "sequelize-typescript";

@Table({ tableName: "Integrations" })
class Integration extends Model<Integration> {
  @PrimaryKey
  @Column
  key: string;

  @Column
  value: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default Integration;

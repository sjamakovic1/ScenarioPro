"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const Scenario = require("./Scenario")(sequelize, DataTypes);
const Line = require("./Line")(sequelize, DataTypes);
const Delta = require("./Delta")(sequelize, DataTypes);
const Checkpoint = require("./Checkpoint")(sequelize, DataTypes);

Scenario.hasMany(Line, { foreignKey: "scenarioId" });
Line.belongsTo(Scenario, { foreignKey: "scenarioId" });

Scenario.hasMany(Delta, { foreignKey: "scenarioId" });
Delta.belongsTo(Scenario, { foreignKey: "scenarioId" });

Scenario.hasMany(Checkpoint, { foreignKey: "scenarioId" });
Checkpoint.belongsTo(Scenario, { foreignKey: "scenarioId" });

module.exports = {
  sequelize,
  Scenario,
  Line,
  Delta,
  Checkpoint
};

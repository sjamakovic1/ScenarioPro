"use strict";

module.exports = (sequelize, DataTypes) => {
  return sequelize.define("Checkpoint", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    scenarioId: {
      type: DataTypes.INTEGER
    },
    timestamp: {
      type: DataTypes.INTEGER
    }
  });
};

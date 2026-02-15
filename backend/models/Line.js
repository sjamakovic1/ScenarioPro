"use strict";

module.exports = (sequelize, DataTypes) => {
  return sequelize.define("Line", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    lineId: {
      type: DataTypes.INTEGER
    },
    text: {
      type: DataTypes.TEXT
    },
    nextLineId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    scenarioId: {
      type: DataTypes.INTEGER
    }
  });
};

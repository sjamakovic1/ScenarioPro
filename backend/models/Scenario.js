"use strict";

module.exports = (sequelize, DataTypes) => {
  return sequelize.define("Scenario", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING
    }
  });
};

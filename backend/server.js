"use strict";

const express = require("express");
const path = require("path");
const { Op } = require("sequelize");

const sequelize = require("./db");
const models = require("./models");
const { Scenario, Line, Delta, Checkpoint } = models;

models.sequelize.sync({ force: true });

// Incijalizacija baze sa testnim scenarijem, ovdje je samo zbog starih testova
const initDatabase = require("./seed/initDatabase");

models.sequelize.sync({ force: true })
  .then(() => initDatabase(models))
  .catch(err => console.error(err));
//
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "..")));



const lineLocks = {};
const userLineLock = {};
const charLocks = {};

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function orderContent(content) {
  if (!Array.isArray(content)) return [];

  const byId = new Map();
  const nextOf = new Map();

  for (const l of content) {
    byId.set(l.lineId, l);
    nextOf.set(l.lineId, l.nextLineId);
  }

  let startId = null;
  const pointed = new Set([...nextOf.values()].filter(v => v !== null));

  for (const id of byId.keys())
    if (!pointed.has(id)) startId = id;

  const ordered = [];
  let cur = startId;
  while (byId.has(cur)) {
    ordered.push(byId.get(cur));
    cur = nextOf.get(cur);
  }

  return ordered;
}

function splitWrap20Words(s) {
  if (typeof s !== "string" || s.trim() === "") return [""];
  const words = s.trim().split(/\s+/);
  const out = [];
  for (let i = 0; i < words.length; i += 20)
    out.push(words.slice(i, i + 20).join(" "));
  return out;
}



app.post("/api/scenarios", async (req, res) => {
  const title =
    typeof req.body.title === "string" && req.body.title.trim() !== ""
      ? req.body.title
      : "Neimenovani scenarij";

  const scenario = await Scenario.create({ title });

  await Line.create({
    scenarioId: scenario.id,
    lineId: 1,
    text: "",
    nextLineId: null
  });

  res.status(200).json({
    id: scenario.id,
    title: scenario.title,
    content: [{ lineId: 1, nextLineId: null, text: "" }]
  });
});

app.get("/api/scenarios/:scenarioId", async (req, res) => {
  const scenarioId = parseInt(req.params.scenarioId, 10);

  const scenario = await Scenario.findByPk(scenarioId);
  if (!scenario)
    return res.status(404).json({ message: "Scenario ne postoji!" });

  const lines = await Line.findAll({
    where: { scenarioId },
    order: [["lineId", "ASC"]]
  });

  const content = orderContent(
    lines.map(l => ({
      lineId: l.lineId,
      nextLineId: l.nextLineId,
      text: l.text
    }))
  );

  res.status(200).json({
    id: scenario.id,
    title: scenario.title,
    content
  });
});



app.post("/api/scenarios/:scenarioId/lines/:lineId/lock", async (req, res) => {
  const sid = parseInt(req.params.scenarioId, 10);
  const lid = parseInt(req.params.lineId, 10);
  const { userId } = req.body;

  const scenario = await Scenario.findByPk(sid);
  if (!scenario)
    return res.status(404).json({ message: "Scenario ne postoji!" });

  const line = await Line.findOne({ where: { scenarioId: sid, lineId: lid } });
  if (!line)
    return res.status(404).json({ message: "Linija ne postoji!" });

  const key = `${sid}:${lid}`;
  if (lineLocks[key] && lineLocks[key] !== userId)
    return res.status(409).json({ message: "Linija je vec zakljucana!" });

  if (userLineLock[userId]) delete lineLocks[userLineLock[userId]];

  lineLocks[key] = userId;
  userLineLock[userId] = key;

  res.status(200).json({ message: "Linija je uspjesno zakljucana!" });
});

app.put("/api/scenarios/:scenarioId/lines/:lineId", async (req, res) => {
  const sid = parseInt(req.params.scenarioId, 10);
  const lid = parseInt(req.params.lineId, 10);
  const { userId, newText } = req.body;

  if (!Array.isArray(newText) || newText.length === 0)
    return res.status(400).json({ message: "Niz new_text ne smije biti prazan!" });

  const line = await Line.findOne({ where: { scenarioId: sid, lineId: lid } });
  if (!line)
    return res.status(404).json({ message: "Linija ne postoji!" });

  const key = `${sid}:${lid}`;
  if (!lineLocks[key])
    return res.status(409).json({ message: "Linija nije zakljucana!" });
  if (lineLocks[key] !== userId)
    return res.status(409).json({ message: "Linija je vec zakljucana!" });

  const expanded = newText.flatMap(t => splitWrap20Words(t));
  const ts = nowSec();

  line.text = expanded[0];
  await line.save();

  let prev = line;
  let maxLineId = (
    await Line.max("lineId", { where: { scenarioId: sid } })
  );

  for (let i = 1; i < expanded.length; i++) {
    maxLineId++;
    const nl = await Line.create({
      scenarioId: sid,
      lineId: maxLineId,
      text: expanded[i],
      nextLineId: prev.nextLineId
    });
    prev.nextLineId = nl.lineId;
    await prev.save();
    prev = nl;
  }

  const allLines = await Line.findAll({ where: { scenarioId: sid } });
  for (const l of allLines) {
    await Delta.create({
      scenarioId: sid,
      type: "line_update",
      lineId: l.lineId,
      nextLineId: l.nextLineId,
      content: l.text,
      timestamp: ts
    });
  }

  delete lineLocks[key];
  delete userLineLock[userId];

  res.status(200).json({ message: "Linija je uspjesno azurirana!" });
});



app.post("/api/scenarios/:scenarioId/characters/lock", async (req, res) => {
  const sid = parseInt(req.params.scenarioId, 10);
  const { userId, characterName } = req.body;

  const scenario = await Scenario.findByPk(sid);
  if (!scenario)
    return res.status(404).json({ message: "Scenario ne postoji!" });

  charLocks[sid] = charLocks[sid] || {};
  if (charLocks[sid][characterName] && charLocks[sid][characterName] !== userId)
    return res
      .status(409)
      .json({ message: "Konflikt! Ime lika je vec zakljucano!" });

  charLocks[sid][characterName] = userId;
  res.status(200).json({ message: "Ime lika je uspjesno zakljucano!" });
});

app.post("/api/scenarios/:scenarioId/characters/update", async (req, res) => {
  const sid = parseInt(req.params.scenarioId, 10);
  const { userId, oldName, newName } = req.body;

  if (!charLocks[sid] || charLocks[sid][oldName] !== userId)
    return res.status(409).json({ message: "Ime lika nije zakljucano!" });

  const lines = await Line.findAll({ where: { scenarioId: sid } });
  for (const l of lines) {
    l.text = l.text.split(oldName).join(newName);
    await l.save();
  }

  await Delta.create({
    scenarioId: sid,
    type: "char_rename",
    oldName,
    newName,
    timestamp: nowSec()
  });

  delete charLocks[sid][oldName];
  res.status(200).json({ message: "Ime lika je uspjesno promijenjeno!" });
});



app.get("/api/scenarios/:scenarioId/deltas", async (req, res) => {
  const sid = parseInt(req.params.scenarioId, 10);
  const since = parseInt(req.query.since || "0", 10);

  const scenario = await Scenario.findByPk(sid);
  if (!scenario)
    return res.status(404).json({ message: "Scenario ne postoji!" });

  const deltas = await Delta.findAll({
    where: { scenarioId: sid, timestamp: { [Op.gt]: since } },
    order: [["timestamp", "ASC"]]
  });

  res.status(200).json({ deltas });
});



app.post("/api/scenarios/:scenarioId/checkpoint", async (req, res) => {
  const sid = parseInt(req.params.scenarioId, 10);

  const scenario = await Scenario.findByPk(sid);
  if (!scenario)
    return res.status(404).json({ message: "Scenario ne postoji!" });

  await Checkpoint.create({ scenarioId: sid, timestamp: nowSec() });
  res.status(200).json({ message: "Checkpoint je uspjesno kreiran!" });
});

app.get("/api/scenarios/:scenarioId/checkpoints", async (req, res) => {
  const sid = parseInt(req.params.scenarioId, 10);

  const scenario = await Scenario.findByPk(sid);
  if (!scenario)
    return res.status(404).json({ message: "Scenario ne postoji!" });

  const cps = await Checkpoint.findAll({
    where: { scenarioId: sid },
    attributes: ["id", "timestamp"],
    order: [["timestamp", "ASC"]]
  });

  res.status(200).json(cps);
});

app.get("/api/scenarios/:scenarioId/restore/:checkpointId", async (req, res) => {
  const sid = parseInt(req.params.scenarioId, 10);
  const cid = parseInt(req.params.checkpointId, 10);

  const scenario = await Scenario.findByPk(sid);
  if (!scenario)
    return res.status(404).json({ message: "Scenario ne postoji!" });

  const cp = await Checkpoint.findOne({ where: { id: cid, scenarioId: sid } });
  if (!cp)
    return res.status(404).json({ message: "Checkpoint ne postoji!" });

  const baseLines = await Line.findAll({
    where: { scenarioId: sid },
    order: [["lineId", "ASC"]]
  });

  let content = baseLines.map(l => ({
    lineId: l.lineId,
    nextLineId: l.nextLineId,
    text: l.text
  }));

  const deltas = await Delta.findAll({
    where: { scenarioId: sid, timestamp: { [Op.lte]: cp.timestamp } },
    order: [["timestamp", "ASC"]]
  });

  for (const d of deltas) {
    if (d.type === "line_update") {
      const i = content.findIndex(l => l.lineId === d.lineId);
      if (i !== -1) {
        content[i].text = d.content;
        content[i].nextLineId = d.nextLineId;
      }
    }
    if (d.type === "char_rename") {
      content = content.map(l => ({
        ...l,
        text: l.text.split(d.oldName).join(d.newName)
      }));
    }
  }

  res.status(200).json({
    id: scenario.id,
    title: scenario.title,
    content
  });
});

app.listen(3000, () => {
  console.log("Backend radi na http://localhost:3000");
});

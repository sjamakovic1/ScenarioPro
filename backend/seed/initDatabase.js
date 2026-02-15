"use strict";

module.exports = async function initDatabase(models) {
  const { Scenario, Line } = models;

  // ================= SCENARIO 1 =================
  const s1 = await Scenario.create({
    title: "Potraga za izgubljenim ključem"
  });

  const scenario1Lines = [
    { lineId: 1,  nextLineId: 2,  text: "NARATOR: Sunce je polako zalazilo nad starim gradom." },
    { lineId: 2,  nextLineId: 3,  text: "ALICE: Jesi li siguran da je ključ ostao u biblioteci?" },
    { lineId: 3,  nextLineId: 11, text: "riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ" },
    { lineId: 4,  nextLineId: 5,  text: "ALICE: Moramo požuriti prije nego što čuvar zaključa glavna vrata." },
    { lineId: 5,  nextLineId: 6,  text: "BOB: Čekaj, čuješ li taj zvuk iza polica?" },
    { lineId: 6,  nextLineId: null, text: "NARATOR: Iz sjene se polako pojavila nepoznata figura." },
    { lineId: 7,  nextLineId: 8,  text: "riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ" },
    { lineId: 8,  nextLineId: 4,  text: "riječ riječ riječ riječ riječ" },
    { lineId: 9,  nextLineId: 10, text: "riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ riječ" },
    { lineId: 10, nextLineId: 7,  text: "riječ riječ riječ riječ riječ" },
    { lineId: 11, nextLineId: 9,  text: "22 56 57 65" }
  ];

  for (const l of scenario1Lines) {
    await Line.create({
      scenarioId: s1.id,
      lineId: l.lineId,
      nextLineId: l.nextLineId,
      text: l.text
    });
  }

  // ================= SCENARIO 2 =================
  const s2 = await Scenario.create({
    title: "Novi scenarij"
  });

  await Line.create({
    scenarioId: s2.id,
    lineId: 1,
    nextLineId: null,
    text: ""
  });

  console.log("✔ Baza inicijalizovana sa 2 scenarija");
};

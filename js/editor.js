"use strict";

document.addEventListener("DOMContentLoaded", function () {
const btnToggleDeltas = document.getElementById("btnToggleDeltas");
const panelDeltas = document.getElementById("panelDeltas");
const deltasList = document.getElementById("deltasList");
btnToggleDeltas.onclick = () => {
    panelDeltas.classList.toggle("hidden");
};
function renderDelta(delta) {
    const div = document.createElement("div");
    div.className = "delta-item";

    const time = new Date(delta.timestamp * 1000).toLocaleTimeString();

    let content = "";

    if (delta.type === "line_update") {
        content = `Linija ${delta.lineId}: ${delta.content}`;
    }

    if (delta.type === "char_rename") {
        content = `Lik: ${delta.oldName} → ${delta.newName}`;
    }

    div.innerHTML = `
        <div class="delta-type">${delta.type}</div>
        <div class="delta-time">${time}</div>
        <div class="delta-content">${content}</div>
    `;

    deltasList.prepend(div);
}

    const btnModeScenario = document.getElementById("btnModeScenario");
    const btnModeScene = document.getElementById("btnModeScene");
    const btnModeCharacter = document.getElementById("btnModeCharacter");

    const panelScenario = document.getElementById("panelScenario");
    const panelCharacter = document.getElementById("panelCharacter");

    function clearModes() {
        document.querySelectorAll(".mode-btn").forEach(b =>
            b.classList.remove("active")
        );
        panelScenario.classList.add("hidden");
        panelCharacter.classList.add("hidden");
    }

    function togglePanel(button, panel) {
        const isActive = button.classList.contains("active");
        clearModes();
        if (!isActive) {
            button.classList.add("active");
            panel.classList.remove("hidden");
        }
    }

    btnModeScenario.onclick = () => togglePanel(btnModeScenario, panelScenario);
    btnModeCharacter.onclick = () => togglePanel(btnModeCharacter, panelCharacter);

    btnModeScene.onclick = () => {
        clearModes();
        btnModeScene.classList.add("active");
    };

    const div = document.getElementById("divEditor");
    const poruke = document.getElementById("poruke");
    const lockStatus = document.getElementById("lockStatus");
    const btnSave = document.getElementById("btnSave");

    const editor = EditorTeksta(div);

    let lastTs = 0;
    let lockedLineId = null;

    btnSave.disabled = true;

    function getScenarioId() {
        return parseInt(document.getElementById("inputScenarioId").value, 10);
    }

    function getUserId() {
        return parseInt(document.getElementById("inputUserId").value, 10);
    }

    function print(x) {
        if (poruke)
            poruke.innerText = typeof x === "string" ? x : JSON.stringify(x, null, 2);
    }

    function renderScenes() {
        const ul = document.getElementById("sceneList");
        ul.innerHTML = "";

        for (const s of editor.dajScene()) {
            const li = document.createElement("li");
            li.className = "scene-item";
            li.innerHTML = `<div class="scene-title">${s.index}. ${s.naslov}</div>`;
            li.onclick = () => {
                const el = div.querySelector(`[data-line-id="${s.lineId}"]`);
                el?.scrollIntoView({ behavior: "smooth", block: "center" });
            };
            ul.appendChild(li);
        }
    }

    function loadScenario() {
        const scenarioId = getScenarioId();

        PoziviAjaxFetch.getScenario(scenarioId, (status, data) => {
            if (status !== 200) {
                print(data?.message);
                return;
            }

            editor.ucitajScenario(data);
            renderScenes();

            if (lockedLineId === null) {
                btnSave.disabled = true;
                editor.ukloniZakljucavanje();
                lockStatus.textContent = "Nije zaključano";
                lockStatus.className = "lock-box unlocked";
            }
        });
    }

    loadScenario();

    document.getElementById("btnLoadScenario").onclick = loadScenario;

    document.getElementById("btnNewScenario").onclick = () => {
        PoziviAjaxFetch.postScenario("Novi scenarij", (status, data) => {
            if (status === 200) {
                document.getElementById("inputScenarioId").value = data.id;
                loadScenario();
            }
        });
    };

    div.addEventListener("mouseup", () => {
        if (lockedLineId !== null) return;

        const lineId = editor.dajAktivnuLiniju();
        if (!lineId) return;

        PoziviAjaxFetch.lockLine(
            getScenarioId(),
            lineId,
            getUserId(),
            (status) => {
                if (status === 200) {
                    lockedLineId = lineId;
                    btnSave.disabled = false;
                    editor.oznaciZakljucanuLiniju(lineId);
                    lockStatus.textContent = "Zaključano";
                    lockStatus.className = "lock-box locked";
                }
            }
        );
    });

    btnSave.onclick = () => {
        if (!lockedLineId) return;

        const lineEl = div.querySelector(`[data-line-id="${lockedLineId}"]`);
        if (!lineEl) {
            print("Zaključana linija nije pronađena.");
            return;
        }

        const html = (lineEl.innerHTML || "").trim().toLowerCase();
        const text =
            (html === "" || html === "<br>" || html === "<br/>" || html === "<br />")
                ? ""
                : (lineEl.textContent || "");

        PoziviAjaxFetch.updateLine(
            getScenarioId(),
            lockedLineId,
            getUserId(),
            [text],
            () => {
                lockedLineId = null;
                btnSave.disabled = true;

                editor.ukloniZakljucavanje();
                lockStatus.textContent = "Nije zaključano";
                lockStatus.className = "lock-box unlocked";

                loadScenario();
            }
        );
    };

    const oldNameInput = document.getElementById("oldCharacterName");
    const newNameInput = document.getElementById("newCharacterName");
    const btnLockCharacter = document.getElementById("btnLockCharacter");
    const btnRenameCharacter = document.getElementById("btnRenameCharacter");
    const characterLockStatus = document.getElementById("characterLockStatus");

    btnLockCharacter.onclick = () => {
        const name = oldNameInput.value.trim();
        if (!name) {
            characterLockStatus.textContent = "Unesi ime lika.";
            return;
        }

        PoziviAjaxFetch.lockCharacter(
            getScenarioId(),
            name,
            getUserId(),
            (status, data) => {
                if (status === 200) {
                    characterLockStatus.textContent = "Ime zaključano.";
                } else {
                    characterLockStatus.textContent = data?.message || "Greška.";
                }
            }
        );
    };

    btnRenameCharacter.onclick = () => {
        const oldName = oldNameInput.value.trim();
        const newName = newNameInput.value.trim();

        if (!oldName || !newName) {
            characterLockStatus.textContent = "Unesi oba imena.";
            return;
        }

        PoziviAjaxFetch.updateCharacter(
            getScenarioId(),
            getUserId(),
            oldName,
            newName,
            (status, data) => {
                if (status === 200) {
                    characterLockStatus.textContent = "Ime promijenjeno.";
                    editor.preimenujUlogu(oldName, newName);
                } else {
                    characterLockStatus.textContent = data?.message || "Greška.";
                }
            }
        );
    };

    setInterval(() => {
        if (lockedLineId !== null) return;

        PoziviAjaxFetch.getDeltas(
            getScenarioId(),
            lastTs,
            (status, data) => {
                if (status !== 200) return;

               for (const d of data.deltas || []) {
    lastTs = Math.max(lastTs, d.timestamp || lastTs);

    renderDelta(d);

    if (d.type === "line_update") loadScenario();
    if (d.type === "char_rename")
        editor.preimenujUlogu(d.oldName, d.newName);
}

            }
        );
    }, 2000);
});

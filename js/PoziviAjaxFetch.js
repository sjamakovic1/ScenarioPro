"use strict";

const PoziviAjaxFetch = (function () {
    const API_BASE = "http://localhost:3000/api";

    function call(url, options, callback) {
        fetch(url, options)
            .then(async (res) => {
                let data = null;
                try {
                    data = await res.json();
                } catch (e) {
                    data = { message: "Neispravan JSON odgovor sa servera." };
                }
                callback(res.status, data);
            })
            .catch((err) => {
                callback(0, { message: err.message });
            });
    }

    return {
        postScenario: function (title, callback) {
            call(
                `${API_BASE}/scenarios`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title })
                },
                callback
            );
        },

        getScenario: function (scenarioId, callback) {
            call(
                `${API_BASE}/scenarios/${scenarioId}`,
                { method: "GET" },
                callback
            );
        },

        lockLine: function (scenarioId, lineId, userId, callback) {
            call(
                `${API_BASE}/scenarios/${scenarioId}/lines/${lineId}/lock`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId })
                },
                callback
            );
        },

           updateLine: function (scenarioId, lineId, userId, newText, callback) {
    const payload = {
        userId,
        newText: Array.isArray(newText) ? newText : [newText]
    };

    call(
        `${API_BASE}/scenarios/${scenarioId}/lines/${lineId}`,
        {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        },
        callback
    );
},

        lockCharacter: function (scenarioId, characterName, userId, callback) {
            call(
                `${API_BASE}/scenarios/${scenarioId}/characters/lock`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId, characterName })
                },
                callback
            );
        },

        updateCharacter: function (scenarioId, userId, oldName, newName, callback) {
            call(
                `${API_BASE}/scenarios/${scenarioId}/characters/update`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId, oldName, newName })
                },
                callback
            );
        },

        getDeltas: function (scenarioId, since, callback) {
            call(
                `${API_BASE}/scenarios/${scenarioId}/deltas?since=${since}`,
                { method: "GET" },
                callback
            );
        }
    };
})();

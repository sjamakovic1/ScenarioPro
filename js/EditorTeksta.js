"use strict";

let EditorTeksta = function (divRef) {
    if (!divRef || !(divRef instanceof HTMLElement)) throw new Error("Pogresan tip elementa!");
    if (divRef.tagName !== "DIV") throw new Error("Pogresan tip elementa!");
    let ce = divRef.getAttribute("contenteditable");
    if (ce === null || ce.toLowerCase() !== "true") throw new Error("Neispravan DIV, ne posjeduje contenteditable atribut!");

    let rootDiv = divRef;


    rootDiv.addEventListener("keydown", function (e) {
        if (e.key !== "Enter") return;

        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;

        let node = sel.anchorNode;
        if (!node) return;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;

        const lineEl = node.closest("div[data-line-id]");
        if (!lineEl) return;

        e.preventDefault();

        const range = sel.getRangeAt(0);

        const newLine = document.createElement("div");
        newLine.dataset.lineId = "temp-" + Date.now();

        const tailRange = range.cloneRange();
        tailRange.setEndAfter(lineEl.lastChild || lineEl);

        const fragment = tailRange.extractContents();
        if (fragment && fragment.childNodes && fragment.childNodes.length > 0) {
            newLine.appendChild(fragment);
        } else {
            newLine.innerHTML = "<br>";
        }

        if ((lineEl.textContent || "").trim().length === 0) {
            lineEl.innerHTML = "<br>";
        }

        lineEl.after(newLine);

        const newRange = document.createRange();
        newRange.setStart(newLine, 0);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
    });

    let getLines2 = function () {
        const lineDivs = rootDiv.querySelectorAll("div[data-line-id]");
        return Array.from(lineDivs).map(d => {
            const html = (d.innerHTML || "").trim().toLowerCase();
            if (html === "" || html === "<br>" || html === "<br/>" || html === "<br />") return "";
            return (d.textContent || "");
        });
    };

    let getLines = function () {
        let html = rootDiv.innerHTML || "";
        html = html.replace(/<br\s*\/?>/gi, "\n");
        let parts = html.split(/\r?\n/);
        let lines = [];
        for (let p of parts) {
            let s = p.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ");
            lines.push(s);
        }
        return lines;
    };

    let isSceneTitle = function (line) {
        let t = line.trim();
        if (t.length === 0) return false;
        return /^(INT\.|EXT\.)/i.test(t);
    };

    let extractSceneTitle = function (line) {
        let match = line.match(/^(INT\.|EXT\.)[^a-z]+/);
        if (match) return match[0].trim();
        return line.trim();
    };

    let isUlogaLine = function (line) {
        let t = line.trim();
        if (t.length === 0) return false;
        if (!/^[A-Z\s]+$/.test(t)) return false;
        if (!/[A-Z]/.test(t)) return false;
        return true;
    };

    let isParenthesisLine = function (line) {
        let t = line.trim();
        return /^\([^\)]+\)$/.test(t);
    };

    let isGovorLine = function (line) {
        let t = line.trim();
        if (t.length === 0) return false;
        if (isSceneTitle(t)) return false;
        if (isUlogaLine(t)) return false;
        if (isParenthesisLine(t)) return false;
        return true;
    };

    let isActionLine = function (line) {
        let t = line.trim();
        if (t.length === 0) return false;
        if (isSceneTitle(t)) return false;
        if (isUlogaLine(t)) return false;
        if (isParenthesisLine(t)) return false;
        return true;
    };

    let parseBlockFrom = function (lines, index) {
        let name = lines[index].trim().toUpperCase();
        let len = lines.length;
        let j = index + 1;

        if (j >= len) return null;
        while (j < len && isParenthesisLine(lines[j])) j++;
        if (j >= len) return null;
        if (!isGovorLine(lines[j])) return null;

        let linije = [];
        while (j < len) {
            let t = lines[j].trim();
            if (t.length === 0) break;
            if (isSceneTitle(t)) break;
            if (isUlogaLine(t)) break;
            if (isParenthesisLine(t)) {
                j++;
                continue;
            }
            if (isGovorLine(t)) {
                linije.push(lines[j]);
                j++;
                continue;
            }
            break;
        }

        if (linije.length === 0) return null;

        return {
            uloga: name,
            linije: linije,
            nextIndex: j
        };
    };

    let parseAll = function () {
        let lines = getLines();
        let scenes = [];
        let currentScene = null;
        let i = 0;
        while (i < lines.length) {
            let raw = lines[i];
            let l = raw.trim();

            if (l.length === 0) {
                i++;
                continue;
            }

            if (isSceneTitle(l)) {
                const naslov = extractSceneTitle(l);
                currentScene = { naslov, items: [] };
                scenes.push(currentScene);
                i++;
                continue;
            }
            if (!currentScene) {
                i++;
                continue;
            }

            if (isUlogaLine(l)) {
                let block = parseBlockFrom(lines, i);
                if (block) {
                    currentScene.items.push({
                        type: "blok",
                        uloga: block.uloga,
                        linije: block.linije
                    });
                    i = block.nextIndex;
                    continue;
                } else {
                    currentScene.items.push({ type: "akcija" });
                    i++;
                    continue;
                }
            }

            if (isParenthesisLine(l) || isActionLine(l)) {
                currentScene.items.push({ type: "akcija" });
            }

            i++;
        }
        return scenes;
    };

    let dajBrojRijeci = function () {
        let t = rootDiv.innerText || "";
        t = t.replace(/\s+/g, " ").trim();
        if (t.length === 0) {
            return { ukupno: 0, bold: 0, italic: 0, underline: 0 };
        }

        let ukupno = t.split(" ").filter(x => x.trim().length > 0).length;

        let countWordsIn = function (selector) {
            let nodes = rootDiv.querySelectorAll(selector);
            let sum = 0;
            for (let n of nodes) {
                let s = (n.innerText || "").replace(/\s+/g, " ").trim();
                if (s.length === 0) continue;
                sum += s.split(" ").filter(x => x.trim().length > 0).length;
            }
            return sum;
        };

        return {
            ukupno: ukupno,
            bold: countWordsIn("b, strong"),
            italic: countWordsIn("i, em"),
            underline: countWordsIn("u")
        };
    };

    let dajUloge = function () {
        let lines = getLines();
        let set = new Set();

        for (let i = 0; i < lines.length; i++) {
            let l = lines[i];
            if (!isUlogaLine(l)) continue;

            let block = parseBlockFrom(lines, i);
            if (block) {
                set.add(block.uloga);
                i = block.nextIndex - 1;
            }
        }

        return Array.from(set);
    };

    let pogresnaUloga = function () {
        let scenes = parseAll();
        let uloge = dajUloge();
        if (uloge.length === 0) return [];

        let count = {};
        for (let u of uloge) count[u] = 0;

        for (let sc of scenes) {
            for (let it of sc.items) {
                if (it.type === "blok") {
                    if (count.hasOwnProperty(it.uloga)) count[it.uloga]++;
                }
            }
        }

        let editDistance = function (a, b) {
            let la = a.length, lb = b.length;
            if (Math.abs(la - lb) > 2) return Infinity;
            let dp = Array(la + 1).fill(null).map(() => Array(lb + 1).fill(0));
            for (let i = 0; i <= la; i++) dp[i][0] = i;
            for (let j = 0; j <= lb; j++) dp[0][j] = j;
            for (let i = 1; i <= la; i++) {
                for (let j = 1; j <= lb; j++) {
                    let cost = a[i - 1] === b[j - 1] ? 0 : 1;
                    dp[i][j] = Math.min(
                        dp[i - 1][j] + 1,
                        dp[i][j - 1] + 1,
                        dp[i - 1][j - 1] + cost
                    );
                }
            }
            return dp[la][lb];
        };

        let res = [];
        let added = new Set();

        for (let A of uloge) {
            for (let B of uloge) {
                if (A === B) continue;

                let aC = count[A];
                let bC = count[B];

                if (bC < 4) continue;
                if (bC < aC + 3) continue;

                let d = editDistance(A, B);
                if (A.length <= 5) {
                    if (d <= 1 && !added.has(A)) {
                        added.add(A);
                        res.push(A);
                    }
                } else {
                    if (d <= 2 && !added.has(A)) {
                        added.add(A);
                        res.push(A);
                    }
                }
            }
        }

        return res;
    };

    let brojLinijaTeksta = function (uloga) {
        if (!uloga || typeof uloga !== "string") return 0;
        let target = uloga.trim().toUpperCase();
        let lines = getLines();
        let total = 0;

        for (let i = 0; i < lines.length; i++) {
            let l = lines[i];
            if (!isUlogaLine(l)) continue;

            let block = parseBlockFrom(lines, i);
            if (!block) continue;
            if (block.uloga === target) total += block.linije.length;
            i = block.nextIndex - 1;
        }

        return total;
    };

    let scenarijUloge = function (uloga) {
        if (!uloga || typeof uloga !== "string") return [];
        let target = uloga.trim().toUpperCase();
        let scenes = parseAll();
        let result = [];

        for (let sc of scenes) {
            let blokovi = [];
            for (let it of sc.items) {
                if (it.type === "blok") blokovi.push(it);
            }

            for (let i = 0; i < blokovi.length; i++) {
                let b = blokovi[i];
                if (b.uloga !== target) continue;

                let prev = null;
                let next = null;

                if (i > 0) {
                    prev = {
                        uloga: blokovi[i - 1].uloga,
                        linije: blokovi[i - 1].linije
                    };
                }
                if (i < blokovi.length - 1) {
                    next = {
                        uloga: blokovi[i + 1].uloga,
                        linije: blokovi[i + 1].linije
                    };
                }

                result.push({
                    scena: sc.naslov,
                    pozicijaUTekstu: i + 1,
                    prethodni: prev,
                    trenutni: {
                        uloga: target,
                        linije: b.linije
                    },
                    sljedeci: next
                });
            }
        }

        return result;
    };

    let grupisiUloge = function () {
        let scenes = parseAll();
        let res = [];

        for (let sc of scenes) {
            let segment = 1;
            let currentBlocks = [];

            for (let it of sc.items) {
                if (it.type === "blok") {
                    currentBlocks.push(it);
                } else if (it.type === "akcija") {
                    if (currentBlocks.length > 0) {
                        let names = [];
                        let seen = new Set();
                        for (let b of currentBlocks) {
                            if (!seen.has(b.uloga)) {
                                seen.add(b.uloga);
                                names.push(b.uloga);
                            }
                        }
                        res.push({
                            scena: sc.naslov,
                            segment: segment,
                            uloge: names
                        });
                        segment++;
                        currentBlocks = [];
                    }
                }
            }

            if (currentBlocks.length > 0) {
                let names = [];
                let seen = new Set();
                for (let b of currentBlocks) {
                    if (!seen.has(b.uloga)) {
                        seen.add(b.uloga);
                        names.push(b.uloga);
                    }
                }
                res.push({
                    scena: sc.naslov,
                    segment: segment,
                    uloge: names
                });
            }
        }

        return res;
    };

    let formatirajTekst = function (komanda) {
        if (!komanda || !["bold", "italic", "underline"].includes(komanda)) return false;

        let sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return false;
        let range = sel.getRangeAt(0);
        if (!rootDiv.contains(range.commonAncestorContainer)) return false;
        if (range.collapsed || sel.isCollapsed) return false;

        document.execCommand(komanda, false, null);
        return true;
    };

    let ucitajScenario = function (scenario, aktivnaLinijaId = null) {
        rootDiv.innerHTML = "";
        for (let l of scenario.content) {
            let d = document.createElement("div");
            d.dataset.lineId = l.lineId;
            d.innerHTML = l.text === "" ? "<br>" : l.text;
            if (l.lineId === aktivnaLinijaId) {
                d.classList.add("active-line");
            }
            rootDiv.appendChild(d);
        }
    };

    let dajAktivnuLiniju = function () {
        let sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return null;
        let node = sel.anchorNode;
        while (node && node !== rootDiv) {
            if (node.dataset && node.dataset.lineId)
                return parseInt(node.dataset.lineId, 10);
            node = node.parentNode;
        }
        return null;
    };

    let postaviTekstLinije = function (lineId, text) {
        let el = rootDiv.querySelector(`[data-line-id="${lineId}"]`);
        if (!el) return;
        if (typeof text !== "string" || text === "") el.innerHTML = "<br>";
        else el.innerText = text;
    };

    let preimenujUlogu = function (oldName, newName) {
        if (!oldName || !newName) return;
        let oldU = oldName.trim().toUpperCase();
        let newU = newName.trim().toUpperCase();

        let els = rootDiv.querySelectorAll("div[data-line-id]");
        for (let el of els) {
            let t = (el.innerText || "").trim();
            if (isUlogaLine(t) && t.toUpperCase() === oldU) {
                el.innerText = newU;
            }
        }
    };

    let dajScene = function () {
        let scenes = parseAll();
        return scenes.map((s, i) => ({
            index: i + 1,
            naslov: s.naslov
        }));
    };

    let oznaciZakljucanuLiniju = function (lineId) {
        ukloniZakljucavanje();
        let el = rootDiv.querySelector(`[data-line-id="${lineId}"]`);
        if (el) el.classList.add("locked-line");
    };

    let oznaciAktivnuLiniju = function (lineId) {
        rootDiv.querySelectorAll(".active-line").forEach(el =>
            el.classList.remove("active-line")
        );
        let el = rootDiv.querySelector(`[data-line-id="${lineId}"]`);
        if (el) el.classList.add("active-line");
    };

    let ukloniZakljucavanje = function () {
        rootDiv.querySelectorAll(".locked-line").forEach(el =>
            el.classList.remove("locked-line")
        );
    };

   
    rootDiv.addEventListener("keydown", function (e) {
        if (e.key !== "Backspace") return;

        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;

        let node = sel.anchorNode;
        if (!node) return;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;

        const lineEl = node.closest("div[data-line-id]");
        if (!lineEl) return;

        const r = sel.getRangeAt(0);
        const atStart = r.collapsed && (
            (r.startContainer === lineEl && r.startOffset === 0) ||
            (r.startContainer.nodeType === Node.TEXT_NODE && r.startOffset === 0)
        );

        if ((lineEl.textContent || "").trim().length === 0 || atStart) {
            e.preventDefault();
        }
    });


    rootDiv.addEventListener("keydown", function (e) {
        if (e.key !== "Delete") return;

        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;

        let node = sel.anchorNode;
        if (!node) return;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;

        const lineEl = node.closest("div[data-line-id]");
        if (!lineEl) return;

        const r = sel.getRangeAt(0);
        const text = (lineEl.textContent || "");
        const atEnd = r.collapsed && (
            (r.startContainer === lineEl && r.startOffset === lineEl.childNodes.length) ||
            (r.startContainer.nodeType === Node.TEXT_NODE && r.startOffset === (r.startContainer.textContent || "").length)
        );

        if ((text.trim().length === 0) || atEnd) {
            e.preventDefault();
        }
    });

    return {
        dajBrojRijeci,
        dajUloge,
        pogresnaUloga,
        brojLinijaTeksta,
        scenarijUloge,
        grupisiUloge,
        formatirajTekst,
        ucitajScenario,
        dajAktivnuLiniju,
        postaviTekstLinije,
        preimenujUlogu,
        dajScene,
        oznaciZakljucanuLiniju,
        ukloniZakljucavanje,
        oznaciAktivnuLiniju,
        getLines2
    };
};

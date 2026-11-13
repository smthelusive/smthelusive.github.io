(function () {
    var engine = window.BytecodeEngine;
    var levels = window.BytecodeLevels;
    var STEP_MS = 550;
    var STORAGE_KEY = 'bytecode-puzzle';

    var $ = function (sel, root) { return (root || document).querySelector(sel); };
    var el = {
        levels: $('.bp-levels'),
        levelLabel: $('.bp-level-label'),
        toolbox: $('.bp-toolbox'),
        help: $('.bp-help'),
        codeHeader: $('.bp-code-header'),
        program: $('.bp-program'),
        run: $('.bp-run'),
        step: $('.bp-step'),
        reset: $('.bp-reset'),
        clear: $('.bp-clear'),
        now: $('.bp-now'),
        goal: $('.bp-goal'),
        status: $('.bp-status')
    };

    // ---------- Saved progress ----------
    // Only a convenience: the game works fine when storage is unavailable.
    var saved = { current: 0, solved: {}, programs: {} };
    try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (raw) saved = Object.assign(saved, JSON.parse(raw));
    } catch (e) {}

    function save() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); } catch (e) {}
    }

    // ---------- Game state ----------
    var levelIndex = Math.min(saved.current || 0, levels.length - 1);
    var level;
    var program;      // array of instruction strings
    var run;          // { pc, state, done, error } while executing, else null
    var timer = null;

    function loadLevel(index) {
        stopTimer();
        levelIndex = index;
        level = levels[index];
        program = (saved.programs[index] || []).slice();
        trimToTools();
        run = null;
        saved.current = index;
        save();
        renderAll();
        setStatus('');
    }

    // Drop saved instructions that no longer fit the bag (e.g. after a level was edited).
    function trimToTools() {
        var used = {};
        program = program.filter(function (insn) {
            used[insn] = (used[insn] || 0) + 1;
            return used[insn] <= (level.tools[insn] || 0);
        });
    }

    function remaining(insn) {
        var used = program.filter(function (p) { return p === insn; }).length;
        return level.tools[insn] - used;
    }

    function programChanged() {
        stopTimer();
        run = null;
        saved.programs[levelIndex] = program.slice();
        save();
        setStatus('');
        renderToolbox();
        renderProgram();
        renderMachine(el.now, engine.initialState(level));
    }

    // ---------- Rendering ----------
    function renderAll() {
        renderLevelPicker();
        el.levelLabel.textContent = 'level ' + levelIndex;
        el.codeHeader.textContent = 'Code: stack=' + (level.maxStack || 8) + ', locals=' + localCount();
        renderToolbox();
        renderProgram();
        renderMachine(el.now, engine.initialState(level));
        renderMachine(el.goal, goalAsState());
    }

    function renderLevelPicker() {
        el.levels.innerHTML = '';
        levels.forEach(function (_, i) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'bp-level-dot' + (i === levelIndex ? ' current' : '') + (saved.solved[i] ? ' solved' : '');
            b.textContent = i;
            b.setAttribute('aria-label', 'Level ' + i + (saved.solved[i] ? ' (solved)' : ''));
            if (i === levelIndex) b.setAttribute('aria-current', 'step');
            b.addEventListener('click', function () { loadLevel(i); });
            el.levels.appendChild(b);
        });
    }

    function category(insn) {
        if (/^(iconst|bipush)/.test(insn)) return 'const';
        if (/^(iload|istore|iinc)/.test(insn)) return 'local';
        if (/^(dup|swap|pop)/.test(insn)) return 'shuffle';
        return 'math';
    }

    function makeTile(insn) {
        var t = document.createElement('div');
        t.className = 'bp-tile bp-tile-' + category(insn);
        t.textContent = insn;
        t.dataset.insn = insn;
        return t;
    }

    function renderToolbox() {
        el.toolbox.innerHTML = '';
        Object.keys(level.tools).forEach(function (insn) {
            var left = remaining(insn);
            var t = makeTile(insn);
            t.classList.add('bp-source');
            t.setAttribute('role', 'button');
            t.setAttribute('tabindex', left > 0 ? '0' : '-1');
            t.setAttribute('aria-label', insn + ', ' + left + ' left. ' + engine.help(insn));
            if (left === 0) t.classList.add('empty');
            var badge = document.createElement('span');
            badge.className = 'bp-count';
            badge.textContent = '×' + left;
            t.appendChild(badge);
            t.addEventListener('pointerenter', function () { showHelp(insn); });
            t.addEventListener('focus', function () { showHelp(insn); });
            t.addEventListener('keydown', function (e) {
                if ((e.key === 'Enter' || e.key === ' ') && remaining(insn) > 0) {
                    e.preventDefault();
                    program.push(insn);
                    programChanged();
                    focusTool(insn);
                }
            });
            enableDrag(t, { from: 'toolbox', insn: insn });
            el.toolbox.appendChild(t);
        });
    }

    function focusTool(insn) {
        var t = el.toolbox.querySelector('[data-insn="' + insn + '"]');
        if (t && !t.classList.contains('empty')) t.focus();
    }

    function showHelp(insn) {
        el.help.innerHTML = '';
        var code = document.createElement('code');
        code.textContent = insn;
        el.help.appendChild(code);
        el.help.appendChild(document.createTextNode(' ' + engine.help(insn)));
    }

    // Real byte offsets, like javap prints them.
    function insnSize(insn) {
        if (/^bipush/.test(insn)) return 2;
        if (/^iinc/.test(insn)) return 3;
        return 1;
    }

    function renderProgram(placeholderAt) {
        el.program.innerHTML = '';
        var offset = 0;
        var items = program.slice();
        if (placeholderAt !== undefined) items.splice(placeholderAt, 0, null);
        if (items.length === 0) {
            var empty = document.createElement('li');
            empty.className = 'bp-empty';
            empty.textContent = 'drag instructions here';
            el.program.appendChild(empty);
        }
        var pi = 0;
        items.forEach(function (insn) {
            var li = document.createElement('li');
            if (insn === null) {
                li.className = 'bp-placeholder';
                el.program.appendChild(li);
                return;
            }
            var index = pi++;
            li.className = 'bp-line';
            if (run && run.pc === index && !run.done && !run.error) li.classList.add('next');
            if (run && index < run.pc) li.classList.add('ran');
            if (run && run.error && run.pc === index) li.classList.add('failed');
            var off = document.createElement('span');
            off.className = 'bp-offset';
            off.textContent = offset + ':';
            offset += insnSize(insn);
            li.appendChild(off);
            var tile = makeTile(insn);
            enableDrag(tile, { from: 'program', index: index, insn: insn });
            tile.addEventListener('pointerenter', function () { showHelp(insn); });
            li.appendChild(tile);
            var x = document.createElement('button');
            x.type = 'button';
            x.className = 'bp-remove';
            x.textContent = '×';
            x.setAttribute('aria-label', 'Remove ' + insn + ' at offset ' + off.textContent);
            x.addEventListener('click', function () {
                program.splice(index, 1);
                programChanged();
            });
            li.appendChild(x);
            el.program.appendChild(li);
        });
        var hasProgram = program.length > 0;
        el.run.disabled = !hasProgram || !!timer;
        el.step.disabled = el.run.disabled;
        el.clear.disabled = !hasProgram;
    }

    function localCount() {
        return Math.max((level.start.locals || []).length, (level.goal.locals || []).length);
    }

    function goalAsState() {
        return { stack: level.goal.stack || [], locals: level.goal.locals || [], isGoal: true };
    }

    // Draws the stack (top at the top) and the local variable slots.
    // Cells that differ from the previous render pop in, so each step is visible.
    function renderMachine(box, state, previous) {
        var stackEl = $('.bp-stack', box);
        var localsEl = $('.bp-locals', box);
        var prevStack = previous ? previous.stack : state.stack;
        var same = 0;
        while (same < state.stack.length && same < prevStack.length && state.stack[same] === prevStack[same]) same++;

        stackEl.innerHTML = '';
        var slots = level.maxStack ? level.maxStack : Math.max(state.stack.length, 1);
        for (var i = slots - 1; i >= 0; i--) {
            var cell = document.createElement('div');
            if (i < state.stack.length) {
                cell.className = 'bp-cell';
                cell.textContent = state.stack[i];
                if (previous && i >= same) cell.classList.add('pushed');
            } else {
                cell.className = 'bp-cell bp-slot';
            }
            stackEl.appendChild(cell);
        }
        stackEl.classList.toggle('is-empty', state.stack.length === 0);

        localsEl.innerHTML = '';
        var n = localCount();
        for (var j = 0; j < n; j++) {
            var slot = document.createElement('div');
            slot.className = 'bp-local';
            var idx = document.createElement('span');
            idx.className = 'bp-local-index';
            idx.textContent = j;
            var val = document.createElement('span');
            val.className = 'bp-local-value';
            var v = state.locals[j];
            if (state.isGoal && (v === undefined || v === null)) {
                val.textContent = 'any';
                slot.classList.add('any');
            } else {
                val.textContent = v === undefined ? '–' : v;
            }
            if (previous && previous.locals[j] !== v) slot.classList.add('changed');
            slot.appendChild(idx);
            slot.appendChild(val);
            localsEl.appendChild(slot);
        }
        box.querySelector('.bp-locals-label').hidden = n === 0;
    }

    function setStatus(text, kind, extra) {
        el.status.innerHTML = '';
        el.status.className = 'bp-status' + (kind ? ' ' + kind : '');
        if (!text) return;
        var p = document.createElement('p');
        p.textContent = text;
        el.status.appendChild(p);
        if (extra) el.status.appendChild(extra);
        var close = document.createElement('button');
        close.type = 'button';
        close.className = 'bp-dismiss';
        close.textContent = '×';
        close.setAttribute('aria-label', 'Dismiss');
        close.addEventListener('click', function () { setStatus(''); });
        el.status.appendChild(close);
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') setStatus('');
    });

    // ---------- Running ----------
    function stopTimer() {
        if (timer) clearInterval(timer);
        timer = null;
    }

    function stepOnce() {
        if (!run) run = { pc: 0, state: engine.initialState(level) };
        if (run.done || run.error) return false;
        // Starting over after a finished run: show the start state again before the first step.
        if (run.pc === 0) renderMachine(el.now, run.state);
        var insn = program[run.pc];
        var before = run.state;
        try {
            run.state = engine.step(run.state, insn);
        } catch (e) {
            if (!(e instanceof engine.VmError)) throw e;
            run.error = e;
            stopTimer();
            renderProgram();
            setStatus('java.lang.' + e.kind + ': ' + e.message + ' at ' + offsetOf(run.pc) + ': ' + insn, 'error');
            return false;
        }
        run.pc++;
        renderMachine(el.now, run.state, before);
        if (run.pc >= program.length) {
            run.done = true;
            stopTimer();
            finish();
        }
        renderProgram();
        return !run.done;
    }

    function offsetOf(index) {
        var off = 0;
        for (var i = 0; i < index; i++) off += insnSize(program[i]);
        return off;
    }

    function finish() {
        if (!engine.matches(run.state, level.goal)) {
            setStatus('The method finished, but the machine doesn\'t match the goal yet.', 'miss');
            return;
        }
        var best = saved.solved[levelIndex];
        if (!best) countSolve(levelIndex);
        if (!best || program.length < best) saved.solved[levelIndex] = program.length;
        save();
        renderLevelPicker();

        var extra = document.createElement('div');
        extra.className = 'bp-win-extra';
        var score = document.createElement('p');
        score.className = 'bp-score';
        score.textContent = program.length <= level.par
            ? program.length + ' instructions. That\'s par!'
            : program.length + ' instructions. Par is ' + level.par + '. Can you trim it?';
        extra.appendChild(score);
        if (level.outro) {
            var outro = document.createElement('p');
            outro.className = 'bp-outro';
            outro.textContent = level.outro;
            extra.appendChild(outro);
        }
        if (levelIndex < levels.length - 1) {
            var next = document.createElement('button');
            next.type = 'button';
            next.className = 'hand-button';
            next.textContent = 'next level →';
            next.addEventListener('click', function () { loadLevel(levelIndex + 1); });
            extra.appendChild(next);
        } else {
            var end = document.createElement('p');
            end.textContent = 'That was the last one. More levels soon, maybe.';
            extra.appendChild(end);
        }
        setStatus('Verified! The stack checks out.', 'win', extra);
        confetti();
    }

    // Same hits.sh trick as the coffee button: loading the badge bumps a counter.
    // One counter per level, first solve per browser only, and never from local previews.
    // Stats: https://hits.sh/nataliiadziubenko.com/bytecode-puzzle-solved-<level>/
    function countSolve(index) {
        if (location.hostname !== 'nataliiadziubenko.com') return;
        new Image().src = 'https://hits.sh/nataliiadziubenko.com/bytecode-puzzle-solved-' + index + '.svg';
    }

    function confetti() {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        var colors = ['#FCE3C5', '#8BBCCC', '#9F73AB', '#B9E4C9', '#5C2E7E'];
        var burst = document.createElement('div');
        burst.className = 'bp-confetti';
        for (var i = 0; i < 28; i++) {
            var bit = document.createElement('span');
            bit.style.background = colors[i % colors.length];
            bit.style.setProperty('--dx', (Math.random() * 360 - 180) + 'px');
            bit.style.setProperty('--dy', (Math.random() * -220 - 40) + 'px');
            bit.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
            burst.appendChild(bit);
        }
        el.status.appendChild(burst);
        setTimeout(function () { burst.remove(); }, 1400);
    }

    // After a finished or failed run, run and step start over from the beginning.
    function restartIfFinished() {
        if (run && (run.done || run.error)) run = null;
    }

    el.run.addEventListener('click', function () {
        if (timer) return;
        restartIfFinished();
        setStatus('');
        if (stepOnce()) {
            timer = setInterval(stepOnce, STEP_MS);
            renderProgram();
        }
    });
    el.step.addEventListener('click', function () {
        restartIfFinished();
        setStatus('');
        stepOnce();
    });
    el.reset.addEventListener('click', function () {
        stopTimer();
        run = null;
        setStatus('');
        renderProgram();
        renderMachine(el.now, engine.initialState(level));
    });
    el.clear.addEventListener('click', function () {
        program = [];
        programChanged();
    });

    // ---------- Drag and drop ----------
    // Pointer events instead of HTML5 drag and drop, so it works with touch too.
    // A short press without movement counts as a tap.
    var drag = null;

    function enableDrag(tile, source) {
        tile.addEventListener('pointerdown', function (e) {
            if (e.button !== 0) return;
            if (source.from === 'toolbox' && remaining(source.insn) === 0) return;
            e.preventDefault();
            if (drag) cancelDrag();
            drag = { source: source, tile: tile, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, started: false, ghost: null, dropAt: undefined };
        });
    }

    // Move and release are tracked on the window, so the drag can't get lost
    // when the pointer leaves the tile or the tile gets re-rendered.
    window.addEventListener('pointermove', function (e) {
        if (!drag || e.pointerId !== drag.pointerId) return;
        if (!drag.started) {
            if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 6) return;
            startDrag(e);
        }
        moveGhost(e);
    });

    window.addEventListener('pointerup', function (e) {
        if (!drag || e.pointerId !== drag.pointerId) return;
        var d = drag;
        drag = null;
        if (d.started) {
            endDrag(d, e);
        } else if (d.source.from === 'toolbox') {
            program.push(d.source.insn);
            programChanged();
        }
    });

    window.addEventListener('pointercancel', function (e) {
        if (drag && e.pointerId === drag.pointerId) cancelDrag();
    });

    function cancelDrag() {
        var d = drag;
        drag = null;
        if (d.started) {
            cleanUpDrag(d);
            // A cancelled move puts the instruction back where it was.
            if (d.source.from === 'program') program.splice(d.source.index, 0, d.source.insn);
        }
        programChanged();
    }

    function cleanUpDrag(d) {
        d.ghost.remove();
        document.body.classList.remove('bp-dragging');
        el.program.classList.remove('drop-target');
    }

    function startDrag(e) {
        drag.started = true;
        var rect = drag.tile.getBoundingClientRect();
        drag.offsetX = drag.startX - rect.left;
        drag.offsetY = drag.startY - rect.top;
        var ghost = makeTile(drag.source.insn);
        ghost.classList.add('bp-ghost');
        ghost.style.width = rect.width + 'px';
        document.body.appendChild(ghost);
        drag.ghost = ghost;
        showHelp(drag.source.insn);
        if (drag.source.from === 'program') {
            // Lift it out of the method while it's being moved.
            program.splice(drag.source.index, 1);
            drag.tile.classList.add('bp-lifted');
        } else {
            drag.tile.classList.add('bp-lifting');
        }
        document.body.classList.add('bp-dragging');
    }

    function moveGhost(e) {
        drag.ghost.style.transform = 'translate(' + (e.clientX - drag.offsetX) + 'px,' + (e.clientY - drag.offsetY) + 'px) rotate(-3deg)';
        var at = overProgram(e) ? dropIndex(e.clientY) : undefined;
        if (at !== drag.dropAt) {
            drag.dropAt = at;
            el.program.classList.toggle('drop-target', at !== undefined);
            // A line lifted out of the method stays in the DOM (hidden) until the drop,
            // so only re-render the program when the drag started in the toolbox.
            if (drag.source.from === 'toolbox') renderProgram(at);
            else movePlaceholder(at);
        }
    }

    function movePlaceholder(at) {
        var old = el.program.querySelector('.bp-placeholder');
        if (old) old.remove();
        if (at === undefined) return;
        var lines = visibleLines();
        var ph = document.createElement('li');
        ph.className = 'bp-placeholder';
        el.program.insertBefore(ph, lines[at] || null);
    }

    function overProgram(e) {
        var r = el.program.closest('.bp-program-panel').getBoundingClientRect();
        return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    }

    // The lifted line is hidden but still in the DOM, so leave it out.
    function visibleLines() {
        return Array.prototype.filter.call(el.program.querySelectorAll('.bp-line'), function (li) {
            return !li.querySelector('.bp-lifted');
        });
    }

    function dropIndex(y) {
        var at = 0;
        visibleLines().forEach(function (li) {
            var r = li.getBoundingClientRect();
            if (y > r.top + r.height / 2) at++;
        });
        return at;
    }

    function endDrag(d, e) {
        cleanUpDrag(d);
        // Land exactly where the placeholder was shown.
        var at = overProgram(e) ? (d.dropAt !== undefined ? d.dropAt : dropIndex(e.clientY)) : undefined;
        if (at !== undefined) program.splice(at, 0, d.source.insn);
        // Dropped anywhere else: a tile from the method goes back to the toolbox.
        programChanged();
    }

    loadLevel(levelIndex);
})();

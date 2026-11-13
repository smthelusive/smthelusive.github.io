// Checks every level: finds the shortest solution and counts how many solutions exist.
// Usage, from this folder: node _solve.js
//   or with macOS's built-in JavaScriptCore:
//   /System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc _solve.js
// (Jekyll skips files starting with "_", so this never gets published.)
var engine, levels, log;
if (typeof require !== 'undefined') {
    engine = require('./engine.js');
    levels = require('./levels.js');
    log = console.log;
} else {
    load('engine.js');
    load('levels.js');
    engine = globalThis.BytecodeEngine;
    levels = globalThis.BytecodeLevels;
    log = print;
}

levels.forEach(function (level, index) {
    var best = null;
    var count = 0;

    function search(state, program, left) {
        if (program.length > 0 && engine.matches(state, level.goal)) {
            count++;
            if (!best || program.length < best.length) best = program.slice();
        }
        Object.keys(left).forEach(function (insn) {
            if (left[insn] === 0) return;
            var next;
            try { next = engine.step(state, insn); } catch (e) { return; }
            left[insn]--;
            program.push(insn);
            search(next, program, left);
            program.pop();
            left[insn]++;
        });
    }

    search(engine.initialState(level), [], Object.assign({}, level.tools));
    var ok = best && best.length === level.par;
    log((ok ? 'ok  ' : 'FAIL') + ' ' + index + '.' +
        ' | par ' + level.par + ', shortest ' + (best ? best.length : '-') +
        ', solutions ' + count + ' | ' + (best ? best.join(', ') : 'unsolvable'));
});

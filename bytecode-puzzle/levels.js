// Each level: a start state, a goal state, and a limited bag of instructions.
// You don't have to use every instruction. `par` is the shortest solution (checked by _solve.js).
(function (root) {
    var LEVELS = [
        {
            start: {},
            goal: { stack: [3] },
            tools: { 'iconst_1': 1, 'iconst_2': 1, 'iadd': 1 },
            par: 3
        },
        {
            start: {},
            goal: { stack: [8] },
            tools: { 'iconst_2': 1, 'dup': 2, 'imul': 2 },
            par: 5
        },
        {
            start: { stack: [7, 3] },
            goal: { stack: [-4] },
            tools: { 'swap': 1, 'isub': 1, 'pop': 1 },
            par: 2
        },
        {
            start: { stack: [1, 2] },
            goal: { stack: [2, 1] },
            tools: { 'dup_x1': 1, 'dup': 1, 'pop': 1, 'iadd': 1 },
            par: 2
        },
        {
            start: { stack: [3, 5] },
            goal: { stack: [5, 8] },
            tools: { 'dup_x1': 1, 'dup': 1, 'swap': 1, 'iadd': 1, 'pop': 1 },
            par: 2
        },
        {
            start: { locals: [5] },
            goal: { locals: [6] },
            tools: { 'iload_0': 1, 'iconst_1': 1, 'iadd': 1, 'istore_0': 1, 'isub': 1 },
            par: 4
        },
        {
            start: { locals: [4, 9] },
            goal: { locals: [9, 4] },
            tools: { 'iload_0': 1, 'iload_1': 1, 'istore_0': 1, 'istore_1': 1 },
            par: 4
        },
        {
            start: { locals: [17, 5] },
            goal: { stack: [2] },
            tools: { 'iload_0': 1, 'iload_1': 1, 'swap': 1, 'idiv': 1, 'irem': 1 },
            par: 3
        },
        {
            start: {},
            goal: { stack: [100] },
            maxStack: 2,
            tools: { 'iconst_5': 1, 'iconst_4': 1, 'dup': 1, 'imul': 2, 'iadd': 1 },
            par: 5
        },
        {
            start: { locals: [2, 3, 4] },
            goal: { stack: [14] },
            maxStack: 2,
            tools: { 'iload_0': 1, 'iload_1': 1, 'iload_2': 1, 'iadd': 1, 'imul': 1 },
            par: 5
        },
        {
            start: {},
            goal: { stack: [-2147483648] },
            tools: { 'iconst_1': 1, 'bipush 31': 1, 'ishl': 1, 'ineg': 1, 'swap': 1 },
            par: 3,
            outro: 'Fun fact: ineg on Integer.MIN_VALUE gives Integer.MIN_VALUE back. It is its own negative.'
        }
    ];

    root.BytecodeLevels = LEVELS;
    if (typeof module !== 'undefined') module.exports = LEVELS;
})(typeof window !== 'undefined' ? window : globalThis);

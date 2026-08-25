const VALUE_FLAGS = new Set(['source', 'destination', 'archive', 'confirm']);
const BOOLEAN_FLAGS = new Set(['apply']);

export type ParsedChainStateMigrationArgs = {
	readonly values: ReadonlyMap<string, string>;
	readonly apply: boolean;
};

export function parseChainStateMigrationArgs(argv: readonly string[]): ParsedChainStateMigrationArgs {
	const values = new Map<string, string>();
	let apply = false;
	let index = 0;
	if (argv[0] === '--') index = 1;
	for (; index < argv.length; index += 1) {
		const argument = argv[index];
		if (argument === '--') throw new Error('standalone -- is only allowed at the beginning');
		if (!argument.startsWith('--')) throw new Error(`unexpected argument: ${argument}`);
		const [name, inline] = argument.slice(2).split('=', 2);
		if (!VALUE_FLAGS.has(name) && !BOOLEAN_FLAGS.has(name)) throw new Error(`unknown flag: --${name}`);
		if (values.has(name) || (name === 'apply' && apply)) throw new Error(`duplicate flag: --${name}`);
		if (BOOLEAN_FLAGS.has(name)) {
			if (inline !== undefined) throw new Error(`boolean flag --${name} takes no value`);
			apply = true;
			continue;
		}
		const value = inline ?? argv[index + 1];
		if (!value || value.startsWith('--')) throw new Error(`missing value for --${name}`);
		values.set(name, value);
		if (inline === undefined) index += 1;
	}
	return { values, apply };
}

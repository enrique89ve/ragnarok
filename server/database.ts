import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL as string;

let pool: Pool | null = null;

if (databaseUrl) {
	pool = new Pool({
		connectionString: databaseUrl,
		ssl: databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
	});
	console.log('Database connection initialized with URL:', databaseUrl.replace(/:[^:]*@/, ':***@'));
} else {
	console.log('DATABASE_URL not set — database wrapper disabled');
}

export const db = pool ? {
	async query(text: string, params: any[] = []) {
		try {
			const result = await pool!.query(text, params);
			return { rows: result.rows };
		} catch (error) {
			console.error('Database query error:', error);
			throw error;
		}
	},
	execute(text: string, params: any[] = []) {
		return this.query(text, params);
	}
} : null;

export { pool };

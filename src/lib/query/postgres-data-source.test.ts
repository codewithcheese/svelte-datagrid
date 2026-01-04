import { PGlite } from '@electric-sql/pglite';
import { createPostgresDataSource } from './postgres-data-source.js';
import { createDataSourceTests, testData, TestRow } from './data-source.test-suite.js';

// Store db reference for cleanup
let db: PGlite;

createDataSourceTests<TestRow>({
	name: 'PostgresDataSource',
	createDataSource: async () => {
		// Create in-memory PgLite database
		db = new PGlite();

		// Create schema
		await db.exec(`
			CREATE TABLE users (
				id SERIAL PRIMARY KEY,
				name TEXT NOT NULL,
				age INTEGER NOT NULL,
				email TEXT NOT NULL,
				active BOOLEAN NOT NULL DEFAULT true,
				"createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
			)
		`);

		// Seed data
		for (const row of testData) {
			await db.query(
				`INSERT INTO users (name, age, email, active, "createdAt") VALUES ($1, $2, $3, $4, $5)`,
				[row.name, row.age, row.email, row.active, row.createdAt]
			);
		}

		// Create data source
		return createPostgresDataSource<TestRow>({
			connection: db,
			table: 'users',
			idColumn: 'id'
		});
	},
	cleanup: async (dataSource) => {
		dataSource.destroy?.();
		await db.close();
	}
});

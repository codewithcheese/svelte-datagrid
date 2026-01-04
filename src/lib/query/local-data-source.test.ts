import { createLocalDataSource, LocalDataSource } from './local-data-source.js';
import { createDataSourceTests, testData, TestRow } from './data-source.test-suite.js';

// Convert testData to include id field for LocalDataSource
const dataWithIds: TestRow[] = testData.map((row, index) => ({
	id: index + 1,
	...row
}));

createDataSourceTests<TestRow>({
	name: 'LocalDataSource',
	createDataSource: async () => {
		// Create fresh copy of data for each test
		const data = dataWithIds.map(row => ({ ...row }));
		return createLocalDataSource(data, 'id');
	},
	cleanup: async (dataSource) => {
		dataSource.destroy?.();
	}
});

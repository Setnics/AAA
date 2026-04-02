import 'fake-indexeddb/auto';
import { afterEach, beforeEach } from 'vitest';
import { db } from '../database/db';
import { useProjectStore } from '../stores/projectStore';

function resetStoreState() {
  useProjectStore.setState({
    projects: [],
    activeProject: null,
    zones: [],
    circuits: [],
    outlets: [],
    bomEntries: [],
    adjustments: [],
    isLoading: false,
    error: null,
    lastSaved: null,
    bomSubtotal: 0,
    bomTaxAmount: 0,
    bomTotal: 0,
  });
}

async function resetDatabase() {
  db.close();
  await db.delete();
  await db.open();
}

beforeEach(async () => {
  resetStoreState();
  await resetDatabase();
});

afterEach(async () => {
  resetStoreState();
  db.close();
  await db.delete();
});

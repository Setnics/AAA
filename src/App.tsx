import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { ProjectEditor } from './pages/ProjectEditor';
import { Catalog } from './pages/Catalog';
import { db } from './database/db';
import { seedDefaultCatalog } from './database/seedData';

function App() {
  useEffect(() => {
    // Seed default materials on first run
    seedDefaultCatalog(db.materials as unknown as Parameters<typeof seedDefaultCatalog>[0]).then((seeded) => {
      if (seeded) {
        console.info('SEITE: Default materials catalog seeded.');
      }
    });
  }, []);

  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/proyecto/:id" element={<ProjectEditor />} />
            <Route path="/catalogo" element={<Catalog />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;

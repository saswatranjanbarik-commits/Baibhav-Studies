import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db } from "./src/db/index.js";
import { store } from "./src/db/schema.js";
import { eq } from "drizzle-orm";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API to get all store data
  app.get("/api/store", async (req, res) => {
    try {
      const allData = await db.select().from(store);
      const result: Record<string, any> = {};
      allData.forEach((row) => {
        result[row.key] = row.value;
      });
      res.json(result);
    } catch (error: any) {
      console.error("Error fetching store:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API to get a single store key
  app.get("/api/store/:key", async (req, res) => {
    try {
      const { key } = req.params;
      const data = await db.select().from(store).where(eq(store.key, key));
      if (data.length > 0) {
        res.json(data[0].value);
      } else {
        res.status(404).json({ error: "Not found" });
      }
    } catch (error: any) {
      console.error("Error fetching key:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API to update a store key
  app.put("/api/store/:key", async (req, res) => {
    try {
      const { key } = req.params;
      const value = req.body;
      
      await db.insert(store)
        .values({ key, value })
        .onConflictDoUpdate({
          target: store.key,
          set: { value, updatedAt: new Date() }
        });
        
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error saving key:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

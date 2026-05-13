import express from "express";
import { syncRouter } from "./routes/sync.routes";
import { sapB1Service } from "./services/sapB1.service";

export const app = express();

app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/api/sap/login-test", async (_req, res, next) => {
  try {
    const result = await sapB1Service.loginTest();
    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
});

app.use("/api/sync", syncRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({
    success: false,
    message: err.message || "Unexpected server error"
  });
});

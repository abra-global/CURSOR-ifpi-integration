import { Router } from "express";
import { syncAccounts, syncQuotes } from "../controllers/sync.controller";

export const syncRouter = Router();

syncRouter.post("/accounts", (req, res, next) => {
  syncAccounts(req, res).catch(next);
});

syncRouter.post("/quotes", (req, res, next) => {
  syncQuotes(req, res).catch(next);
});

import { Router, type IRouter } from "express";
import healthRouter from "./health";
import protocolsRouter from "./protocols";
import templatesRouter from "./templates";
import phrasesRouter from "./phrases";
import planningImagesRouter from "./planning-images";
import planAiRouter from "./plan-ai";
import files3dRouter from "./files-3d";
import plateCatalogRouter from "./plate-catalog";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(protocolsRouter);
router.use(planningImagesRouter);
router.use(planAiRouter);
router.use(files3dRouter);
router.use(plateCatalogRouter);
router.use(templatesRouter);
router.use(phrasesRouter);
router.use(storageRouter);

export default router;
